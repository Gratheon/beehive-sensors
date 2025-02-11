# gratheon/beehive-sensors
A collection of code for IoT sensors for monitoring beehive on the edge devices, like ESP32.
See [product vision](https://gratheon.com/about/products/%F0%9F%8C%A1%EF%B8%8F%20Beehive%20IoT%20sensors/),
[tech docs](https://gratheon.com/docs/beehive-sensors/) on the installation and wiring

```mermaid
flowchart LR
    beehive-sensors[<a href="https://github.com/Gratheon/beehive-sensors">beehive-sensors</a>] -."send temperature, weight <br /> (every 1 min)".-> telemetry-api[<a href="https://github.com/Gratheon/telemetry-api">telemetry-api</a>]
```

## Features
- serves as a web server on a dedicated WiFi access point (gratheon) to configure the sensor when first booted or after reset button is pressed
- on submit, stores the configuration in the persistent storage (EEPROM) in case of power loss
- every 1 minute sends the telemetry data (temperature) to the cloud (telemetry-api)
- sleeps most of the time to save energy
- blinks LED when active
