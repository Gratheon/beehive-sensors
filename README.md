# gratheon/beehive-sensors
A collection of code for IoT sensors for monitoring beehive on the edge devices, like ESP32

```mermaid
flowchart LR
    hardware-beehive-sensors[<a href="https://github.com/Gratheon/hardware-beehive-sensors">hardware-beehive-sensors</a>] -."send temperature \n(every 1 min)".-> telemetry-api[<a href="https://github.com/Gratheon/telemetry-api">telemetry-api</a>]
```


## Assembly
See [Notion](https://gratheon.notion.site/Bill-of-Materials-IoT-bd5472babeb94957886bafd9b46c92ec) for full list of materials.

### [Temperature sensor](https://gratheon.notion.site/Temperature-Humidity-sensors-DS18B20-8038054a9d3143b89486464c28b11623)

```mermaid
flowchart LR
subgraph ESP32
  VCC1[3.3V]
  GND1[GND]
  GPIO4
end

subgraph DS18B20
    VCC2
    GND2[GND]
    DAT
end

subgraph sensor
    yellow
    red
    black
end

  VCC1 <--> VCC2 <-->red
  GND1 <--> GND2 <--> black
  GPIO4 <--> DAT <--> yellow
```

DS18B20 Temperature Sensor:

- DATA to IO4 (with an optional 4.7kΩ pull-up resistor between DATA and VCC)


### [Weight sensor](https://gratheon.notion.site/Weight-sensor-HX711-20kg-4-a6aef7aaf59a440c9dcb832df014f355)

HX711 Load Cell Amplifier:
- E = Excitation. E+ (Red) and E- (Black) are the excitation wires for the load cell, providing the voltage that powers the load cell.
- A = Amplifier. A+ (White) and A- (Green) are the signal wires from the load cell, carrying the differential signal that the HX711 amplifies.


```mermaid
flowchart LR
subgraph ESP32
  VCC[3.3V]
  GND
  GPIO16
  GPIO17
end

subgraph HX711
    E+
    E-
    A+
    A-
    
    GND2[GND]
    DT
    SCK
    VCC2[VCC]
end

VCC <--> VCC2
GND <--> GND2
GPIO16 <--> DT
GPIO17 <--> SCK

E+ <--> Red
E- <--> Black
A+ <--> Green
A- <--> White

subgraph LoadCell 
    Red
    Green
    Black
    White
end
```

## Installation
- Install [DallasTemperature@3.9.0](https://github.com/milesburton/Arduino-Temperature-Control-Library) library in Arduino IDE (DallasTemperature@3.9.0
- Install [Adafruit HX711 library](https://github.com/adafruit/Adafruit_HX711) in Arduino IDE
- Use Arduino IDE to compile and upload the code to ESP32
- Power on ESP32
- Connect to the ESP32 WIFI network (gratheon), use password `gratheon`
- Open browser and navigate to `http://192.168.4.1`
- Enter your WIFI credentials
- Set target URL `https://telemetry.gratheon.com/metric/HIVE_ID?api_token=API_TOKEN`
    - replace `HIVE_ID` with your hive ID. You can take that you can take from URL, ex `https://app.gratheon.com/apiaries/7/hives/54` <-- ID is `54`
    - replace `API_TOKEN` with generate token from account settings at https://app.gratheon.com/account
- Click `Save` button. Your ESP32 will restart and connect to your WIFI network and start sending data to the telemetry API service

<img width="300" alt="Screenshot 2024-07-26 at 20 07 53" src="https://github.com/user-attachments/assets/b4ed305f-7ddd-44ff-b200-e0d139734349">
