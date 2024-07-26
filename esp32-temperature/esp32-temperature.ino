#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <HTTPClient.h>


// Constants for AP mode
const char* ap_ssid = "gratheon";
const char* ap_password = "gratheon";

// Constants for web server and DNS server
WebServer server(80);
DNSServer dnsServer;

// HTML form to capture WiFi credentials and target URL
const char* form_html = R"rawliteral(
<!DOCTYPE HTML>
<html>
  <head>
    <title>ESP32 WiFi Config</title>
  </head>
  <body>
    <form action="/submit" method="POST">
      <label for="ssid">Target WiFi SSID:</label>
      <input type="text" id="ssid" name="ssid"><br><br>
      <label for="password">Target WiFi Password:</label>
      <input type="password" id="password" name="password"><br><br>
      <label for="url">Target URL:</label>
      <input type="text" id="url" name="url" value="https://telemetry.gratheon.com/metric/hiveID?api_token="><br><br>
      <input type="submit" value="Submit">
    </form>
  </body>
</html>
)rawliteral";

// WIFI access
String wifi_ssid;
String wifi_password;
String target_url;

#define ONE_WIRE_BUS 4 // Define pin for temperature sensor DS18B20 data line
#define LED_PIN 2

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

void connectToWiFi() {
  WiFi.begin(wifi_ssid.c_str(), wifi_password.c_str());
  Serial.println("Connecting to new WiFi network...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Connected to new WiFi network with IP: ");
  Serial.println(WiFi.localIP());
}

void handleRoot() {
  server.send(200, "text/html", form_html);
}

void handleSubmit() {
  wifi_ssid = server.arg("ssid");
  wifi_password = server.arg("password");
  target_url = server.arg("url");

  Serial.println("Received new WiFi credentials and target URL:");
  Serial.println("SSID: " + wifi_ssid);
  Serial.println("Password: " + wifi_password);
  Serial.println("URL: " + target_url);

  server.send(200, "text/html", "<html><body><h2>Configuration Saved! Rebooting...</h2></body></html>");

  delay(2000); // Delay to allow the response to be sent back
  // Disconnect from the AP mode and connect to the specified WiFi network
  WiFi.softAPdisconnect(true);
  connectToWiFi();
}

void setupAPMode() {
  WiFi.softAP(ap_ssid, ap_password);
  IPAddress IP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(IP);

  dnsServer.start(53, "*", IP);
  server.on("/", handleRoot);
  server.on("/submit", HTTP_POST, handleSubmit);
  server.begin();
}

void setup() {
  Serial.begin(115200);
  delay(100);

  // Start in AP mode to allow configuration
  setupAPMode();
  sensors.begin();

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Ensure LED is off initially
}

void loop() {
  // Handle DNS and HTTP server in AP mode
  dnsServer.processNextRequest();
  server.handleClient();

  // Once connected to the new WiFi network, perform the main tasks
  if (WiFi.status() == WL_CONNECTED) {
    // Blink LED
    digitalWrite(LED_PIN, HIGH); // Turn LED on

    sensors.requestTemperatures();
    float temperatureC = sensors.getTempCByIndex(0);

    HTTPClient http;

    http.begin(target_url); // Specify the URL
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
}
