#include <WiFi.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <HTTPClient.h>


// WIFI access
#define WIFI_SSID ""
#define WIFI_PW ""

// Target
const char* serverName = "https://telemetry.gratheon.com/metric";
const char* hiveId = ""; // fill in your hive id from https://app.gratheon.com/hives
const char* apiToken = ""; // fill in your api token from https://app.gratheon.com/account


#define ONE_WIRE_BUS 4 // Define pin for temperature sensor DS18B20 data line
#define LED_PIN 2

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

void connectToWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PW);
  Serial.println("Connecting");
  while(WiFi.status() != WL_CONNECTED) { 
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Connected to WiFi network with IP: ");
  Serial.println(WiFi.localIP());
}



void setup() {
  Serial.begin(115200);
  delay(100);

  connectToWiFi();
  sensors.begin();

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Ensure LED is off initially
}

void loop() {
  // Blink LED
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi Disconnected");
    delay(10000); // retry connection every 10 sec

    return;
  }

  digitalWrite(LED_PIN, HIGH); // Turn LED on

  sensors.requestTemperatures();
  float temperatureC = sensors.getTempCByIndex(0);

  HTTPClient http;

  // Create the full URL with hiveId and apiToken
  String url = String(serverName) + "/" + hiveId + "?api_token=" + apiToken;

  http.begin(url); // Specify the URL
  http.addHeader("Content-Type", "application/json"); // Specify content-type header

  // Create JSON object to send
  String jsonPayload = "{\"fields\":{\"temperature\":" + String(temperatureC) + "}}";
  Serial.print(jsonPayload);

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

  delay(500); // Adjust the delay for desired blink duration
  digitalWrite(LED_PIN, LOW); // Turn LED off

  delay(60000); // wait for a minute
}
