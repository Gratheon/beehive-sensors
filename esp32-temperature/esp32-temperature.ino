#include <WiFi.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <HTTPClient.h>

// Replace with your network credentials
const char* ssid     = "your_SSID";
const char* password = "your_PASSWORD";

// Constants for endpoint
const char* hiveId = "123";
const char* apiToken = "456";
const char* serverName = "https://telemetry.gratheon.com/metric";

// Define pin for DS18B20 data line
#define ONE_WIRE_BUS 4

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

void setup() {
  Serial.begin(115200);
  
  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected!");

  sensors.begin();
}

void loop() {
  sensors.requestTemperatures();
  float temperatureC = sensors.getTempCByIndex(0);

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;

    // Create the full URL with hiveId and apiToken
    String url = String(serverName) + "/" + hiveId + "?api_token=" + apiToken;

    http.begin(url); // Specify the URL
    http.addHeader("Content-Type", "application/json"); // Specify content-type header

    // Create JSON object to send
    String jsonPayload = "{\"temperature\":" + String(temperatureC) + "}";

    int httpResponseCode = http.POST(jsonPayload);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println(httpResponseCode);
      Serial.println(response);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
    }

    http.end(); // Free resources
  } else {
    Serial.println("WiFi Disconnected");
  }
  
  delay(10000); // Post data every 10 seconds
}
