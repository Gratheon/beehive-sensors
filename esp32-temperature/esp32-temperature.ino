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
    <style>
      * {
        font-family: PT Sans Serif, Arial, sans-serif;
      }
      table {
        width: 100%;
        max-width: 600px;
        margin: auto;
        border-collapse: collapse;
      }
      th, td {
        padding: 10px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      input[type="text"], input[type="password"] {
        width: 100%;
        padding: 8px;
        box-sizing: border-box;
      }
      input[type="submit"] {
        width: 100%;
        padding: 10px;
        background-color: #4CAF50;
        color: white;
        border: none;
        cursor: pointer;
      }
      input[type="submit"]:hover {
        background-color: #45a049;
      }
    </style>
  </head>
  <body>
    <form action="/submit" method="POST">
      <img decoding="async" loading="lazy" 
        src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2aWV3Qm94PSIwIDAgNTAwIDE0NyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB4PSIyMy41NDQiIHk9IjUzLjczMSIgd2lkdGg9IjQ1Ni44ODgiIGhlaWdodD0iNzYuNzIyIiBzdHlsZT0ic3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgc3Ryb2tlLXdpZHRoOiAyNXB4OyBzdHJva2UtbGluZWNhcDogcm91bmQ7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyBmaWxsOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ii8+CiAgPGcgdHJhbnNmb3JtPSJtYXRyaXgoMS4wMDYwMTg5OTYyMzg3MDg1LCAwLCAwLCAxLjAwNjAxODk5NjIzODcwODUsIDEwNy4wNDE2MjU5NzY1NjI1LCAtMTQzLjE1MjMyODQ5MTIxMDk0KSIgc3R5bGU9IiI+CiAgICA8dGl0bGU+VEg8L3RpdGxlPgogICAgPGcgdHJhbnNmb3JtPSJtYXRyaXgoMC4yMTI5OTYsIDAsIDAsIDAuMjEyOTk2LCA2My4zMDkzNDYsIDE3Ni45NjEyNzYpIiBzdHlsZT0iIj4KICAgICAgPHRpdGxlPmJhY2tncm91bmQ8L3RpdGxlPgogICAgICA8ZyBkaXNwbGF5PSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgeT0iMCIgeD0iMCIgaGVpZ2h0PSIxMDAlIiB3aWR0aD0iMTAwJSIgaWQ9ImNhbnZhc0dyaWQiPgogICAgICAgIDxyZWN0IGZpbGw9InVybCgjZ3JpZHBhdHRlcm4pIiBzdHJva2Utd2lkdGg9IjAiIHk9IjAiIHg9IjAiIGhlaWdodD0iMTAwJSIgd2lkdGg9IjEwMCUiIHN0eWxlPSJzdHJva2UtbGluZWpvaW46IHJvdW5kOyBzdHJva2UtbGluZWNhcDogcm91bmQ7Ii8+CiAgICAgIDwvZz4KICAgIDwvZz4KICAgIDxlbGxpcHNlIHN0eWxlPSJzdHJva2UtbWl0ZXJsaW1pdDogNC42Mzsgc3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7IHN0cm9rZS1saW5lY2FwOiByb3VuZDsgc3Ryb2tlLXdpZHRoOiAwcHg7IGZpbGw6IHJnYigyNTUsIDI1NSwgMjU1KTsiIGN4PSIxMzguOTYxIiBjeT0iMTg5LjUyMyIgcng9IjQ0LjY3MyIgcnk9IjQ0LjY3MyI+CiAgICAgIDx0aXRsZT5zdW4td2hpdGU8L3RpdGxlPgogICAgPC9lbGxpcHNlPgogICAgPHJlY3QgeD0iMTI1LjM4OSIgeT0iMTk3LjIzNiIgd2lkdGg9IjI5LjQ2NiIgaGVpZ2h0PSI0NS45MjIiIHN0eWxlPSJzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsgc3Ryb2tlLXdpZHRoOiAwcHg7IGZpbGw6IHJnYigyNTUsIDI1NSwgMjU1KTsiPgogICAgICA8dGl0bGU+VDwvdGl0bGU+CiAgICA8L3JlY3Q+CiAgICA8ZWxsaXBzZSBzdHlsZT0iZmlsbDogcmdiKDI1NSwgMjE3LCAwKTsgc3Ryb2tlLW1pdGVybGltaXQ6IDQuNjM7IHN0cm9rZS1saW5lam9pbjogcm91bmQ7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyBzdHJva2UtbGluZWNhcDogcm91bmQ7IHN0cm9rZS13aWR0aDogMHB4OyIgY3g9IjE0MC4zMDQiIGN5PSIxODkuNTAzIiByeD0iMjcuNTU1IiByeT0iMjcuNTU1Ij4KICAgICAgPHRpdGxlPnN1bjwvdGl0bGU+CiAgICA8L2VsbGlwc2U+CiAgICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjIwNTc1MSwgMCwgMCwgMC4yMDU3NTEsIDY2LjM2Nzg2OCwgMTc2LjIwNDM2NCkiIHN0eWxlPSIiPgogICAgICA8dGl0bGU+YmFja2dyb3VuZDwvdGl0bGU+CiAgICAgIDxnIGRpc3BsYXk9Im5vbmUiIG92ZXJmbG93PSJ2aXNpYmxlIiB5PSIwIiB4PSIwIiBoZWlnaHQ9IjEwMCUiIHdpZHRoPSIxMDAlIiBpZD0iZy0xIj4KICAgICAgICA8cmVjdCBmaWxsPSJ1cmwoI2dyaWRwYXR0ZXJuKSIgc3Ryb2tlLXdpZHRoPSIwIiB5PSIwIiB4PSIwIiBoZWlnaHQ9IjEwMCUiIHdpZHRoPSIxMDAlIiBzdHlsZT0ic3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgc3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyIvPgogICAgICA8L2c+CiAgICA8L2c+CiAgICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgwLjIwMjg0MiwgMCwgMCwgMC4yMDI4NDIsIDY1LjY3NzE0LCAxNzYuMjU4ODA3KSIgc3R5bGU9IiI+CiAgICAgIDx0aXRsZT5IPC90aXRsZT4KICAgICAgPGxpbmUgc3Ryb2tlLWxpbmVjYXA9InVuZGVmaW5lZCIgc3Ryb2tlLWxpbmVqb2luPSJ1bmRlZmluZWQiIGlkPSJzdmdfMSIgeTI9IjQ0NC4xOTMyNSIgeDI9IjI2MS45OTIzNCIgeTE9IjE1NS4xNSIgeDE9IjI2MS45OTIzNCIgc3Ryb2tlLXdpZHRoPSI2MCIgZmlsbD0ibm9uZSIgc3R5bGU9IiIgc3Ryb2tlPSIjMDAwIj4KICAgICAgICA8dGl0bGU+SC1sZWZ0PC90aXRsZT4KICAgICAgPC9saW5lPgogICAgICA8bGluZSBzdHJva2UtbGluZWNhcD0idW5kZWZpbmVkIiBzdHJva2UtbGluZWpvaW49InVuZGVmaW5lZCIgaWQ9InN2Z18yIiB5Mj0iNDQ0LjY5MzI1IiB4Mj0iNDcyLjIyMzMzIiB5MT0iMTU1LjY1IiB4MT0iNDcyLjIyMzMzIiBzdHJva2Utd2lkdGg9IjYwIiBmaWxsPSJub25lIiBzdHlsZT0iIiBzdHJva2U9IiMwMDAiPgogICAgICAgIDx0aXRsZT5ILXJpZ2h0PC90aXRsZT4KICAgICAgPC9saW5lPgogICAgICA8bGluZSBzdHJva2UtbGluZWNhcD0idW5kZWZpbmVkIiBzdHJva2UtbGluZWpvaW49InVuZGVmaW5lZCIgaWQ9InN2Z18zIiB5Mj0iMzY3LjgiIHgyPSI0NzEuOTM1MDMiIHkxPSIzNjcuOCIgeDE9IjI2MS40IiBmaWxsLW9wYWNpdHk9Im51bGwiIHN0cm9rZS1vcGFjaXR5PSJudWxsIiBzdHJva2Utd2lkdGg9IjYwIiBmaWxsPSJub25lIiBzdHlsZT0iIiBzdHJva2U9IiMwMDAiPgogICAgICAgIDx0aXRsZT5ILW1pZDwvdGl0bGU+CiAgICAgIDwvbGluZT4KICAgIDwvZz4KICAgIDxnIHN0eWxlPSIiIHRyYW5zZm9ybT0ibWF0cml4KDEuMDQ0MjcyLCAwLCAwLCAwLjU5MDE1MiwgLTE1MS4yNDg0MTUsIDE1Ni45Njk1OTIpIj4KICAgICAgPHRpdGxlPlQtdG9wPC90aXRsZT4KICAgICAgPHJlY3QgeD0iMjczLjY5NCIgeT0iNjguODM5IiB3aWR0aD0iMTEuNzI5IiBoZWlnaHQ9IjYyLjg0MSIgc3R5bGU9InN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyBzdHJva2Utd2lkdGg6IDBweDsiPgogICAgICAgIDx0aXRsZT5UPC90aXRsZT4KICAgICAgPC9yZWN0PgogICAgICA8cG9seWdvbiBzdHlsZT0ic3Ryb2tlLWxpbmVqb2luOiByb3VuZDsgc3Ryb2tlLWxpbmVjYXA6IHJvdW5kOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsgc3Ryb2tlLXdpZHRoOiAwcHg7IiBwb2ludHM9IjI0MS40NDUgNTIuNTg5IDMxNy4xNDcgNTIuNTg5IDMwNi4zNDIgNzEuOTAyIDI1Mi4yNiA3MS41ODkiPgogICAgICAgIDx0aXRsZT5ULXRvcDwvdGl0bGU+CiAgICAgIDwvcG9seWdvbj4KICAgICAgPHBhdGggc3R5bGU9InN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyBzdHJva2Utd2lkdGg6IDBweDsiIGQ9Ik0gMjczLjY2OSAxMjcuODY2IEMgMjc2Ljg5NiAxMjkuMzA4IDI4Mi44NiAxMjkuMzAyIDI4NS41NCAxMjcuNzc2IEwgMjg1LjI0MSAxMzUuODU3IEMgMjgwLjQ3MSAxMzcuNTczIDI3OS40MzEgMTM3LjU5NCAyNzMuODc3IDEzNS43NjUgTCAyNzMuNjY5IDEyNy44NjYgWiIvPgogICAgICA8cGF0aCBzdHlsZT0iZmlsbDogcmdiKDI1NSwgMjE3LCAwKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7IHN0cm9rZS13aWR0aDogMHB4OyIgZD0iTSAyNzMuNTg3IDk5LjkxNiBDIDI3Ni44NDMgMTAxLjM1OCAyODIuODY1IDEwMS4zNTIgMjg1LjU3IDk5LjgyNiBMIDI4NS41NjggMTA4LjAxIEMgMjgxLjMyOCAxMDkuODg5IDI3Ny44NTkgMTA5LjU3MiAyNzMuNTg3IDEwOC4yMSBMIDI3My41ODcgOTkuOTE2IFoiLz4KICAgICAgPHBhdGggc3R5bGU9ImZpbGw6IHJnYigyNTUsIDIxNywgMCk7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyBzdHJva2Utd2lkdGg6IDBweDsiIGQ9Ik0gMjczLjU0MSAxMTIuMDE1IEMgMjc2Ljc5NyAxMTMuNDU3IDI4Mi44MTggMTEzLjQ1MSAyODUuNTI0IDExMS45MjUgTCAyODUuNTIyIDEyMC4xMDkgQyAyODEuMjgyIDEyMS45ODggMjc3LjgxMiAxMjEuNjcxIDI3My41NDEgMTIwLjMwOSBMIDI3My41NDEgMTEyLjAxNSBaIi8+CiAgICAgIDxwYXRoIHN0eWxlPSJmaWxsOiByZ2IoMjU1LCAyMTcsIDApOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsgc3Ryb2tlLXdpZHRoOiAwcHg7IiBkPSJNIDI3My41NjQgMTI0LjEwOCBDIDI3Ni44MjEgMTI1LjU1IDI4Mi44NDIgMTI1LjU0NCAyODUuNTQ3IDEyNC4wMTggTCAyODUuNTQ1IDEzMi4yMDIgQyAyODEuMzA1IDEzNC4wODEgMjc3LjgzNyAxMzMuNzY0IDI3My41NjQgMTMyLjQwMiBMIDI3My41NjQgMTI0LjEwOCBaIi8+CiAgICA8L2c+CiAgICA8bGluZSBzdHlsZT0iZmlsbDogcmdiKDIxNiwgMjE2LCAyMTYpOyBzdHJva2UtbGluZWNhcDogc3F1YXJlOyBzdHJva2U6IHJnYigyLCA3MiwgMjU1KTsgc3Ryb2tlLXdpZHRoOiAyLjk4MjA1cHg7IiB4MT0iMTE0LjI1NyIgeTE9IjE4OS41MDMiIHgyPSIxNjYuMzQiIHkyPSIxODkuNDQiLz4KICA8L2c+CiAgPHBhdGggZD0iTSA3Mi43NjkgOTQuNDM0IEwgOTYuODY2IDk0LjQwOSBMIDk2Ljg2MSA5Ny44ODYgQyA5Ni44MDQgMTAwLjM1NCA5Ni41OTUgMTAzLjM2IDk1Ljc0NyAxMDYuNDgzIEMgOTUuMjk3IDEwOC4xNDEgOTQuMzcgMTEwLjkyOCA5My4xNTUgMTEyLjgyNSBDIDkxLjQyOCAxMTUuNTIyIDg5LjYzMiAxMTcuNTYxIDg3Ljk2NyAxMTkuMDI3IEMgODYuNDU0IDEyMC4zNTkgODQuMjU3IDEyMi4yOTQgODAuNzIzIDEyMy44MTEgQyA3Ny43NDMgMTI1LjA5IDczLjczIDEyNi4wOTcgNjkuMjEyIDEyNi4xMDkgQyA2NS40NjUgMTI2LjExOSA2MS4wNDcgMTI1LjIwNSA1Ny4yODIgMTIzLjUzOSBDIDUzLjIzIDEyMS43NDYgNDkuODkyIDExOS4xMDggNDcuNzA1IDExNi41NzMgQyA0My43NSAxMTEuOTg5IDM5LjUzMyAxMDUuOTE5IDM5LjQ2NiA5NS44MTMgQyAzOS40MyA5MC40MDQgNDAuNzExIDg1LjIxNSA0Mi45OTkgODEuMDk4IEMgNDUuOTM3IDc1LjgxMSA1MC4zMzEgNzIuMTA3IDUzLjIyNiA3MC4wMjYgQyA1Ny45NTkgNjYuNjI1IDY0LjY3NyA2NC45ODYgNjkuOTMyIDY1LjAxNyBDIDc1LjE5OSA2NS4wNDggNzkuMjQgNjYuMDgyIDgzLjM2MiA2Ny45MzggQyA4Ny41MzEgNjkuODE5IDkwLjY0MiA3My4xNTIgOTQuMTk3IDc2Ljk3NSBMIDg3Ljg2NyA4Mi45MjUgQyA4Ny4yMzYgODEuMzc0IDgzLjc2NCA3OC4yNDcgODIuMTY4IDc3LjAwOSBDIDgwLjU3MiA3NS43NzEgNzcuNDIgNzQuNTc4IDc1Ljc0OCA3NC4wMTQgQyA3My41OCA3My4yODIgNzAuMDgxIDczLjA1NiA2Ni45OTggNzMuNTEgQyA2Mi4wMSA3NC4yNDUgNTguNTQyIDc2LjE0NCA1NS42NDggNzguODU1IEMgNTIuNDQyIDgxLjg1OCA0OC4yNjIgODcuMTc3IDQ4LjI2MiA5NS45OTkgQyA0OC4yNjIgMTA0LjkyMiA1My44MTYgMTExLjAyMiA1Ni44MjcgMTEzLjEzMyBDIDYwLjAwNyAxMTUuMzYyIDY0LjA5NCAxMTcuNzg2IDY5LjMzMSAxMTcuNzg2IEMgNzQuMTI5IDExNy43ODYgNzYuMDY0IDExNi45MjkgNzguNTc5IDExNS4zNjQgQyA4MS4wOTkgMTEzLjc5NiA4MS43MDIgMTEzLjYzNyA4NC44MDcgMTA5LjY5NSBDIDg0LjgwNyAxMDkuNjk1IDg2LjQyIDEwNy4xMTYgODYuOTg4IDEwNC43NDEgQyA4Ny4wODYgMTA0LjMzIDg3LjMyNyAxMDIuNjQ5IDg3LjMyNyAxMDIuNjQ5IEwgNzIuNzQ1IDEwMi42NTMgTCA3Mi43NjkgOTQuNDM0IFoiIHN0eWxlPSJzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsgc3Ryb2tlLXdpZHRoOiAwcHg7Ii8+CiAgPHBhdGggZD0iTSAxMDguNjkxIDY2LjE0NCBMIDEyMS4wMjUgNjYuMTkgQyAxMjUuMzQ3IDY2LjE5IDEzMS4zNTcgNjcuNDk3IDEzMy44MzkgNjkuMDkgQyAxMzcuOTk1IDcxLjc1NyAxNDEuMDcyIDc2LjAwNCAxNDEuNDIzIDgxLjQ4NSBDIDE0MS43MDYgODUuOTAzIDE0MS43NjkgODkuMTk2IDEzNy45NCA5NC4wNTUgQyAxMzQuMTExIDk4LjkxNCAxMzAuOTQzIDk5LjE2MiAxMjguMzI1IDk5Ljc3MiBMIDE0Ni43MjcgMTI0Ljk1NyBMIDEzNS44ODQgMTI0Ljk0IEwgMTE5LjA5NCAxMDAuOTE2IEwgMTE3LjU2MyAxMDAuNzMxIEwgMTE3LjM2OCAxMjUuMDI0IEwgMTA4LjY5MSAxMjUuMDI0IEwgMTA4LjY5MSA2Ni4xNDQgWiBNIDExNy40NjggOTMuMTg0IEMgMTIwLjU0NCA5My4xODQgMTIxLjgyOSA5My40OTkgMTI2LjMxMiA5Mi4zNzQgQyAxMzAuNzk1IDkxLjI0OSAxMzMuMDAxIDg3LjI0OSAxMzMuMDAxIDgzLjg2OCBDIDEzMy4wMDEgODIuMDM3IDEzMi44NzYgODAuMTc1IDEzMS40MDggNzguMjU1IEMgMTI5Ljk0IDc2LjMzNSAxMjcuOTUxIDc1LjYyMiAxMjYuNTU4IDc1LjEzMiBDIDEyNS4xNjUgNzQuNjQyIDEyMy44ODkgNzQuNTcyIDEyMi40NDQgNzQuNDM5IEMgMTIwLjk5OSA3NC4zMDYgMTIwLjM2OSA3NC4zNzYgMTE5LjEyMyA3NC4zNzYgTCAxMTcuNDYyIDc0LjM0OSBMIDExNy40NjggOTMuMTg0IFoiIHN0eWxlPSJzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsgc3Ryb2tlLXdpZHRoOiAwcHg7Ii8+CiAgPHBhdGggZD0iTSAxNzguNDk1IDYyLjQyMSBMIDIwNi40NzggMTI1LjEyIEwgMTk2LjcwOSAxMjUuMDg5IEwgMTkwLjY1MSAxMTAuNTQ0IEwgMTY1LjQ0MiAxMTAuNDc0IEwgMTU4LjU3MiAxMjUuMDcyIEwgMTQ5LjQwNiAxMjQuOTg5IEwgMTc4LjQ5NSA2Mi40MjEgWiBNIDE4Ny4yMDUgMTAyLjMzMyBDIDE4Ny4yMDUgMTAyLjMzMyAxODEuMzA1IDg5LjA0NSAxNzguMzE1IDgyLjIyMyBDIDE3NS40OTEgODguODYyIDE2OS4xNDkgMTAyLjI0NSAxNjkuMTQ5IDEwMi4yNDUgTCAxODcuMjA1IDEwMi4zMzMgWiIgc3R5bGU9InN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyBzdHJva2Utd2lkdGg6IDBweDsiLz4KICA8cGF0aCBkPSJNIDI5Ny42ODggNjYuMzA0IEwgMzMwLjE0MiA2Ni4zMDQgTCAzMzAuMTQyIDc0LjQ5NCBMIDMwNi41MDQgNzQuNDk0IEwgMzA2LjUwNCA4OC43MjIgTCAzMjkuNTA0IDg4LjcyMiBMIDMyOS41MDQgOTcuMDEyIEwgMzA2LjUwNCA5Ny4wMTIgTCAzMDYuNTA0IDExNi43OCBMIDMzMC4xMDggMTE2Ljc4IEwgMzMwLjEwOCAxMjUuMDQ1IEwgMjk3LjY4OCAxMjUuMDQ1IEwgMjk3LjY4OCA2Ni4zMDQgWiIgc3R5bGU9InN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyBzdHJva2Utd2lkdGg6IDBweDsiLz4KICA8cGF0aCBkPSJNIDQwMC42NTMgOTYuOTQ4IEMgNDAwLjY3OCAxMDcuMzQ2IDM5NS4wOTkgMTE0LjU0MiAzOTAuMDU4IDExOC42OTUgQyAzODUuMDE3IDEyMi44NDggMzgwLjk0NyAxMjUuOTIzIDM3MC4yOTkgMTI1LjkyMyBDIDM1OS4xMDUgMTI1LjkyMyAzNTIuODA4IDEyMS43MzMgMzQ4LjIzMiAxMTcuMDMgQyAzNDMuNzAzIDExMi40MjggMzM5LjA0OSAxMDQuMDQgMzM5LjU3NSA5NC4wMTYgQyAzMzkuOTcyIDg2LjQ1MSAzNDMuMDIyIDc5LjEgMzQ5LjI4NyA3My4zOTUgQyAzNTUuODExIDY3LjQ1NCAzNjEuNDM4IDY1LjA5OCAzNzAuMjI2IDY1LjIzNSBDIDM3OS44NzYgNjUuMzg1IDM4My44MzQgNjguMDkgMzg4LjM3OCA3MS4xNjkgQyAzOTMuMDA0IDc0LjMwNCAzOTQuNzI3IDc2Ljk2NiAzOTYuOTgyIDgwLjczOSBDIDQwMC4xMzYgODYuMDE1IDQwMC42MzMgODguNTE5IDQwMC42NTMgOTYuOTQ4IFogTSAzOTIuMTM3IDk3LjI4NCBDIDM5Mi40MjkgODcuMDkzIDM4OC4yMjQgODIuMDI4IDM4NS41NDUgNzkuMzU4IEMgMzgyLjExMyA3NS45MzcgMzc2LjIyNSA3My4zNzIgMzcwLjcwMyA3My4zNzIgQyAzNjUuMTggNzMuMzcyIDM1OS42NDQgNzQuODk0IDM1NS42MjcgNzkuMDIyIEMgMzUxLjYxIDgzLjE1IDM0OC4wNzcgODYuNDMzIDM0OC4wNzcgOTUuNzg5IEMgMzQ4LjA3NyAxMDQuNDA4IDM1Mi45NTQgMTEwLjE4MiAzNTUuODg0IDExMi42NDkgQyAzNTkuMDgxIDExNS4zNDEgMzY0LjcyMyAxMTguMDIzIDM3MC4wNDggMTE4LjAyMyBDIDM3NS4yNzEgMTE4LjAyMyAzODEuNTAyIDExNS40MzYgMzgzLjY1NyAxMTMuMzg1IEMgMzg2LjE5OSAxMTAuOTY3IDM5MS44NzQgMTA2LjQ3MSAzOTIuMTM3IDk3LjI4NCBaIiBzdHlsZT0ic3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7IHN0cm9rZS13aWR0aDogMHB4OyIvPgogIDxwYXRoIGQ9Ik0gNDEyLjU4NSA2Mi4zNTMgTCA0NTUuNTkgMTA3LjI5NyBMIDQ1NS42OCA2Ni4yMjYgTCA0NjQuMzc4IDY2LjI3OSBMIDQ2NC4zNDkgMTI4LjQ5MiBDIDQ2NC4zNDkgMTI4LjQ5MiA0MjEuMzM1IDgzLjUzMSA0MjEuMzgyIDgzLjg2MiBMIDQyMS4zNDIgMTI1LjAxNCBMIDQxMi41MjQgMTI0Ljk0NyBMIDQxMi41ODUgNjIuMzUzIFoiIHN0eWxlPSJzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsgc3Ryb2tlLXdpZHRoOiAwcHg7Ii8+Cjwvc3ZnPg==" 
        style="margin:0 auto; max-width: 50%; max-height: 80px; display: block;" />
      <table>
        <tr>
          <td width="30%"><label for="ssid">Target WiFi SSID:</label></td>
          <td><input type="text" id="ssid" name="ssid"></td>
        </tr>
        <tr>
          <td><label for="password">Target WiFi Password:</label></td>
          <td><input type="password" id="password" name="password"></td>
        </tr>
        <tr>
          <td><label for="api_token">API Token:</label></td>
          <td><input type="text" id="api_token" name="api_token"></td>
        </tr>
        <tr>
          <td><label for="hive_id">Hive ID:</label></td>
          <td><input type="text" id="hive_id" name="hive_id"></td>
        </tr>
        <tr>
          <td><label for="url">Target URL:</label></td>
          <td><input type="text" id="url" name="url" value="https://telemetry.gratheon.com/iot/v1/metrics"></td>
        </tr>
        <tr>
          <td colspan="2"><input type="submit" value="Submit"></td>
        </tr>
      </table>
    </form>
  </body>
</html>
)rawliteral";

// WIFI access
String wifi_ssid;
String wifi_password;
String target_url;
String hive_id;
String api_token;

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
  api_token = server.arg("api_token");
  hive_id = server.arg("hive_id");

  Serial.println("Received new WiFi credentials and target URL:");
  Serial.println("SSID: " + wifi_ssid);
  Serial.println("Password: " + wifi_password);
  Serial.println("URL: " + target_url);
  Serial.println("API Token: " + api_token);
  Serial.println("Hive ID: " + hive_id);

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
    http.addHeader("Authorization", "Bearer " + api_token);

    // Create JSON object to send
    String jsonPayload = "{\"hiveId\":\"" + hive_id + "\", \"fields\":{\"temperatureCelsius\":" + String(temperatureC) + "}}";
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
