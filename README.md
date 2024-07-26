# hardware-beehive-sensors
A collection of code for IoT sensors for monitoring beehive on the edge devices, like ESP32

```mermaid
flowchart LR
	hardware-beehive-sensors[<a href="https://github.com/Gratheon/hardware-beehive-sensors">hardware-beehive-sensors</a>] -."send temperature \n(every 1 min)".-> telemetry-api[<a href="https://github.com/Gratheon/telemetry-api">telemetry-api</a>]
```

## Installation
- Install [DallasTemperature@3.9.0](https://github.com/milesburton/Arduino-Temperature-Control-Library) library in Arduino IDE (DallasTemperature@3.9.0
- Change configuration settings, have your own WIFI credentials
- Set API token that you can get from account settings at https://app.gratheon.com/account
- Set target hive Id (that you can take from URL, ex `https://app.gratheon.com/apiaries/7/hives/54` <-- ID is `54`)
- Compile and upload from Arduino IDE, observe how ESP32 measures and uploads the metrics

<img width="300" alt="Screenshot 2024-07-26 at 20 07 53" src="https://github.com/user-attachments/assets/b4ed305f-7ddd-44ff-b200-e0d139734349">
