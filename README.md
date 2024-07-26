# hardware-beehive-sensors
A collection of code for IoT sensors for monitoring beehive on the edge devices, like ESP32

```mermaid
flowchart LR
	hardware-beehive-sensors[<a href="https://github.com/Gratheon/hardware-beehive-sensors">hardware-beehive-sensors</a>] -."send temperature \n(every 1 min)".-> telemetry-api[<a href="https://github.com/Gratheon/telemetry-api">telemetry-api</a>]
```

## Installation
- Install Dallas Temperature library in Arduino IDE
  DallasTemperature@3.9.0
  https://github.com/milesburton/Arduino-Temperature-Control-Library