# gratheon/beehive-sensors
A collection of code for IoT sensors for monitoring beehive on the edge devices, like ESP32.
See [product vision](https://gratheon.com/about/products/%F0%9F%8C%A1%EF%B8%8F%20Beehive%20IoT%20sensors/).

```mermaid
flowchart LR
    beehive-sensors[<a href="https://github.com/Gratheon/beehive-sensors">hardware-beehive-sensors</a>] -."send temperature \n(every 1 min)".-> telemetry-api[<a href="https://github.com/Gratheon/telemetry-api">telemetry-api</a>]
```

## Installation
See [tech docs](https://gratheon.com/docs/beehive-sensors/) on
- assembly booting up the device

