#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <HTTPClient.h>
#include <HX711.h>
#include <Preferences.h>

// Constants for AP mode
const char* ap_ssid = "gratheon";
const char* ap_password = "gratheon";

// Constants for web server and DNS server
WebServer server(80);
DNSServer dnsServer;


// Preferences for storing WiFi credentials and URL
Preferences preferences;

String wifi_ssid;
String wifi_password;
String target_url;

#define ONE_WIRE_BUS 4 // Define pin for temperature sensor DS18B20 data line
#define LED_PIN 2
#define LOADCELL_DOUT_PIN 16 // Define pin for HX711 DOUT
#define LOADCELL_SCK_PIN 17 // Define pin for HX711 SCK

#define SLEEP_INTERVAL_SEC 10
#define BAUD_RATE 115200


OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
HX711 scale;

void connectToWiFi() {
  WiFi.begin(wifi_ssid.c_str(), wifi_password.c_str());
  Serial.println("Connecting to target WiFi network...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("Connected to target WiFi network with IP: ");
  Serial.println(WiFi.localIP());
}

void serveWifiConfigPage() {
    // HTML form to capture WiFi credentials and target URL
    const char* form_html = R"rawliteral(
    <!DOCTYPE HTML>
    <html>
      <head>
        <title>Gratheon target WiFi Config</title>
      </head>
      <body>
        <form action="/submit" method="POST">
          <label for="ssid">Target WiFi SSID:</label>
          <input type="text" id="ssid" name="ssid" value="gratheon.com"><br><br>
          <label for="password">Target WiFi Password:</label>
          <input type="password" id="password" name="password" value=""><br><br>
          <label for="url">Target URL:</label>
          <input type="text" id="url" name="url" value="https://telemetry.gratheon.com/metric/68?api_token="><br><br>
          <input type="submit" value="Submit">
        </form>
      </body>
    </html>
    )rawliteral";

  server.send(200, "text/html", form_html);
}

void handleSubmit() {
  wifi_ssid = server.arg("ssid");
  wifi_password = server.arg("password");
  target_url = server.arg("url");

  // Save WiFi credentials and URL to Preferences
  preferences.begin("wifi", false);
  preferences.putString("ssid", wifi_ssid);
  preferences.putString("password", wifi_password);
  preferences.putString("url", target_url);
  preferences.end();

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
  server.on("/", serveWifiConfigPage);
  server.on("/submit", HTTP_POST, handleSubmit);
  server.begin();
}




// main function that runs on ESP32 reset or deep sleep wake-up
void setup() {
  Serial.begin(BAUD_RATE);

  // preferences.begin("wifi", true);
  // bool wokeFromDeepSleep = preferences.getBool("deep_sleep_wake", false);
  // preferences.end();

  // Serial.println("wokeFromDeepSleep= " + String(wokeFromDeepSleep));
  // if (wokeFromDeepSleep) {
  //   // Load WiFi credentials and URL from Preferences
  //   preferences.begin("wifi", true);
  //   wifi_ssid = preferences.getString("ssid", "");
  //   wifi_password = preferences.getString("password", "");
  //   target_url = preferences.getString("url", "");
  //   preferences.end();
  //   connectToWiFi();
  // } else {
  //   preferences.begin("wifi", false);
  //   preferences.clear();
  //   preferences.end();
  //   scale.tare();         // Reset the scale to 0
  //   setupAPMode();
  // }
    
  // Initialize HX711
  scale.set_scale();    // Set the scale factor (20kg)
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.tare();	//Reset the scale to 0

  long zero_factor = scale.read_average(); //Get a baseline reading
  Serial.print("Zero factor: "); //This can be used to remove the need to tare the scale. Useful in permanent scale projects.
  Serial.println(zero_factor);


  sensors.begin();

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Ensure LED is off initially
}

void loop() {
  // Handle DNS and HTTP server in AP mode
  // dnsServer.processNextRequest();
  // server.handleClient();

  // Once connected to the new WiFi network, perform the main tasks

    // Blink LED
    digitalWrite(LED_PIN, HIGH); // Turn LED on

    // Get temperature
    sensors.requestTemperatures();
    float temperatureC = sensors.getTempCByIndex(0);

    // Get weight
    scale.set_scale(0.01);
    float weight = scale.get_units(1); // Get weight measurement with 10 samples for average

  if (scale.is_ready()) {
    scale.set_scale();
    Serial.println("Tare... remove any weights from the scale.");
    // delay(5000);
    // scale.tare();
    // Serial.println("Tare done...");
    // Serial.print("Place a known weight on the scale...");
    // delay(5000);
    // long reading = scale.get_units(1);
    // Serial.print("Result: ");
    // Serial.println(reading);
  }
  // else {
  //   Serial.println("HX711 not ready or not found.");
  // }

  String jsonPayload = "{\"fields\":{\"temperature\":" + String(temperatureC) + ",\"weight\":" + String(weight) + "}}";

  Serial.println(jsonPayload);




  // if (WiFi.status() == WL_CONNECTED) {
    // preferences.begin("wifi", false);
    // preferences.putBool("deep_sleep_wake", false);
    // preferences.end();

  // String target_url = "https://telemetry.gratheon.com/metric/68?api_token=90786a32-2a51-4179-89d3-78da206eedb5"

    // // Send results
    // HTTPClient http;
    // http.begin(target_url); // Specify the URL
    // http.addHeader("Content-Type", "application/json"); // Specify content-type header

    // int httpResponseCode = http.POST(jsonPayload);

    // if (httpResponseCode > 0) {
    //   String response = http.getString();
    //   Serial.println(httpResponseCode);
    //   Serial.println(response);
    // } else {
    //   Serial.print("Error on sending POST: ");
    //   Serial.println(httpResponseCode);
    // }

    // http.end(); // Free resources

    delay(50); // Adjust the delay for desired blink duration
    digitalWrite(LED_PIN, LOW); // Turn LED off

    // Set flag indicating we are going to deep sleep
    // preferences.begin("wifi", false);
    // preferences.putBool("deep_sleep_wake", true);
    // preferences.end();

    // Go to deep sleep for 1 minute (60000000 microseconds)
    // Serial.println("Going to deep sleep for " + String(SLEEP_INTERVAL_SEC) + " sec...");
    // esp_sleep_enable_timer_wakeup(SLEEP_INTERVAL_SEC * 1000000);
    // esp_deep_sleep_start();
  // }
}
