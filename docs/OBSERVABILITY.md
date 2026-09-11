**Grafana Alloy itu “collector/agen observability”**, sedangkan **OpenTelemetry (OTel) adalah standar + SDK + protokol untuk menghasilkan dan mengirim telemetry**.

Yang sering bikin bingung: **Alloy bukan pengganti OpenTelemetry**. Justru Alloy bisa menjadi **tempat OpenTelemetry telemetry dikumpulkan, diproses, lalu diteruskan ke backend**.

![Image](https://images.openai.com/static-rsc-4/0vDKjzVdrYgvHcvDHidMIgMNndVEgtTULzg7u1TSmjE3WPuwg7Qq4GdtYVayeYW4yh7tCYUIgVd9IC5PVYA655RKs_cOylxaBQbiishoWOrybD_BP-Jveqjc-SnIYTxOxCBD5QI1d_wOKeu5uqt4zJ9Mdy2idpo-hfBYrqa-X2_zK3Zmy-HIxwPlZro0W1As?purpose=fullsize)

![Image](https://images.openai.com/static-rsc-4/I3bJW2Lr8n7eNPqXqXzv6Z5ehhhyNgS_i8wLAXn18vfz8pzIeXUys0bovbtls-7hHLuzvTxkRBViLQR--oiOnxEQBPS70P6hJhP4KkvermlZ5L8j3ZDXCX4JiwFvM9N-8jMA8_4tq_E2-TEFPhj7sW_pBgtEUYd1GvuvVRHMF-iN3z5FKwY5AjG9qIBsbbbq?purpose=fullsize)

![Image](https://images.openai.com/static-rsc-4/AzRM_XaCDdYzITXzFBYud_5yQPIhIMze710uKYyTWZ9GJLa2QzIJ43Bf74QSxQ3LqZ7hvUjtKOlBQGme2cNLO9XyjcHjksFCJVt-MP8S2obh1vjjYUpGZAovU4wZGDSFTn6EbSCZqcbzA0HFh4xdN_G9KzscotWzyiiDP5JfXd5M76pQyU4VtEk1gdaW3Dhb?purpose=fullsize)

![Image](https://images.openai.com/static-rsc-4/VxUpYO3SFgRdwkPuWw1XaaX5FGP0iYkmNnf1MuQz9-UdaWW36hlb46y8wpqt7i1I8QcHMKziaW7fwrrbO-cO-nnO66b09plcMGsY72yG4l0qAorA4JoEu7swg0hlLIjqHncsRPuxW4RDi4ae804m3TAJsusIv0vvXQRKAT5HBeLigB-6_Uoknxb1FRfSvu1-?purpose=fullsize)

## 1. Gambaran besarnya

Bayangkan aplikasi Go kamu seperti ini:

```text
┌──────────────────────┐
│      Go App          │
│                      │
│ OpenTelemetry SDK    │
│                      │
│  ├── Traces          │
│  ├── Metrics         │
│  └── Logs            │
└──────────┬───────────┘
           │
           │ OTLP
           ▼
┌──────────────────────┐
│    Grafana Alloy     │
│                      │
│ Receiver             │
│      ↓               │
│ Processor             │
│      ↓               │
│ Exporter              │
└──────────┬───────────┘
           │
     ┌─────┼─────────┐
     ▼     ▼         ▼
   Tempo  Mimir     Loki
  traces metrics    logs
     │     │         │
     └─────┼─────────┘
           ▼
        Grafana
```

Jadi:

**Go → OpenTelemetry → OTLP → Alloy → backend → Grafana**

Alloy sendiri berada di **collection layer**, yaitu lapisan yang mengumpulkan, memproses, dan meneruskan telemetry. ([Grafana Labs][1])

---

# 2. Apa sebenarnya OpenTelemetry?

OpenTelemetry bukan database dan bukan dashboard.

OTel menyediakan ekosistem untuk:

```text
Application
    │
    ├── Instrumentation
    │
    ├── SDK
    │
    └── OTLP
```

Misalnya Go application:

```go
tracer := otel.Tracer("payment-service")

ctx, span := tracer.Start(ctx, "create-payment")
defer span.End()
```

Ketika kode berjalan:

```text
create-payment
       │
       ▼
   Span dibuat
       │
       ▼
OTel SDK
       │
       ▼
OTLP
```

OTel bisa menghasilkan:

* **Traces**
* **Metrics**
* **Logs**

dan mengirimkannya menggunakan **OTLP (OpenTelemetry Protocol)**.

---

# 3. Lalu Grafana Alloy itu apa?

Alloy adalah **telemetry collector**.

Grafana menjelaskan Alloy sebagai OpenTelemetry Collector distribution yang juga punya pipeline Prometheus dan integrasi native dengan Loki, Pyroscope, dan backend lainnya. ([Grafana Labs][2])

Artinya Alloy bisa melakukan:

```text
RECEIVE
   ↓
PROCESS
   ↓
FILTER
   ↓
ENRICH
   ↓
ROUTE
   ↓
EXPORT
```

Contohnya:

```text
Go App
  │
  │ OTLP
  ▼
Alloy
  │
  ├── filter
  ├── add attributes
  ├── sampling
  ├── batch
  │
  ├──────────────► Tempo
  │                 traces
  │
  ├──────────────► Mimir
  │                 metrics
  │
  └──────────────► Loki
                    logs
```

Ini salah satu alasan Alloy menarik: satu collector bisa menangani berbagai signal dan backend. ([Grafana Labs][1])

---

# 4. Jadi hubungan OpenTelemetry dan Alloy bagaimana?

Ini bagian paling penting.

Ada **dua komponen berbeda**:

### OpenTelemetry SDK

Berada **di aplikasi**.

```text
┌─────────────── Go Application ───────────────┐
│                                               │
│   Business Code                               │
│       │                                       │
│       ▼                                       │
│   OTel SDK                                    │
│       │                                       │
│       ▼                                       │
│   OTLP Exporter                               │
│                                               │
└────────────────────┬──────────────────────────┘
                     │
                     │ OTLP
                     ▼
```

### Grafana Alloy

Berada **di luar aplikasi**.

```text
                     OTLP
                      │
                      ▼
              ┌──────────────┐
              │ Grafana Alloy│
              └──────────────┘
```

Jadi jangan berpikir:

> "Saya harus memilih OpenTelemetry atau Alloy."

Tidak.

Lebih tepat:

> **OpenTelemetry menginstrumentasi aplikasi, Alloy mengumpulkan dan memproses telemetry tersebut.**

---

# 5. Apa itu OTLP?

OTLP adalah bahasa/protokol komunikasi antara aplikasi/collector.

Misalnya Go mengirim:

```text
Trace:
service.name = payment-api
trace_id = abc123
span = create-payment
duration = 120ms
```

melalui:

```text
OTLP/gRPC
```

atau:

```text
OTLP/HTTP
```

Endpoint default yang umum:

```text
OTLP gRPC
localhost:4317

OTLP HTTP
localhost:4318
```

Alloy dapat menerima keduanya melalui `otelcol.receiver.otlp`. ([Grafana Labs][3])

---

# 6. Contoh nyata dengan Go

Misalkan kamu punya:

```text
payment-api
```

Kamu instrument dengan OpenTelemetry.

```text
payment-api
    │
    │ OTel SDK
    │
    ▼
OTLP exporter
    │
    │ grpc :4317
    ▼
Grafana Alloy
```

Alloy punya receiver:

```alloy
otelcol.receiver.otlp "app" {

    grpc {
        endpoint = "0.0.0.0:4317"
    }

    http {
        endpoint = "0.0.0.0:4318"
    }

    output {
        traces = [
            otelcol.processor.batch.app.input
        ]
    }
}
```

Artinya:

```text
                    ┌────────────────────┐
                    │ otelcol.receiver  │
                    │       .otlp       │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ processor.batch    │
                    └─────────┬──────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ exporter.otlp      │
                    └─────────┬──────────┘
                              │
                              ▼
                            Tempo
```

Grafana sendiri memberikan pola konfigurasi seperti ini untuk menerima OTLP dari aplikasi dan meneruskannya ke backend. ([Grafana Labs][3])

---

# 7. Kenapa tidak langsung Go → Tempo?

Sebenarnya **bisa**.

Misalnya:

```text
Go
 │
 │ OTLP
 ▼
Tempo
```

Tapi masalahnya ketika sistem makin besar.

Misalnya kamu punya:

```text
service-a
service-b
service-c
service-d
service-e
```

Kalau semuanya langsung:

```text
service-a ─────► Tempo
service-b ─────► Tempo
service-c ─────► Tempo
service-d ─────► Tempo
service-e ─────► Tempo
```

Sekarang setiap aplikasi harus tahu:

* endpoint Tempo
* authentication
* TLS
* batching
* retry
* sampling
* routing
* filtering

Lebih bagus:

```text
service-a ─┐
service-b ─┤
service-c ─┤
service-d ─┼──► Alloy ───► Backend
service-e ─┘
```

Aplikasi cukup tahu:

```text
OTEL_EXPORTER_OTLP_ENDPOINT=alloy:4317
```

Sisanya diurus Alloy.

---

# 8. Alloy juga bisa mengambil data yang bukan dari OTel

Ini yang membuat Alloy menarik.

Misalnya:

### Application telemetry

```text
Go
 │
 │ OTLP
 ▼
Alloy
```

### Infrastructure metrics

```text
Linux
 │
 │ Prometheus exporter
 ▼
Alloy
```

### Kubernetes

```text
Kubernetes
 │
 ├── metrics
 ├── logs
 └── metadata
       │
       ▼
     Alloy
```

### eBPF

```text
Linux Kernel
     │
    eBPF
     │
     ▼
   Alloy
```

Kemudian semuanya bisa dirouting:

```text
                  ┌──► Tempo
                  │
Go ──► Alloy ─────┼──► Mimir
                  │
Linux ─► Alloy ───┼──► Loki
                  │
K8s ──► Alloy ────┘
```

Alloy memang dirancang sebagai collection layer yang dapat mengambil telemetry dari berbagai sumber, memprosesnya, kemudian mengirimkannya ke berbagai backend. ([Grafana Labs][1])

---

# 9. Receiver → Processor → Exporter

Kalau kamu sudah pernah melihat OpenTelemetry Collector, konsep Alloy akan terasa familiar.

### Receiver

**Menerima data.**

```text
OTLP
Prometheus
Jaeger
Zipkin
Kafka
...
```

Contoh:

```alloy
otelcol.receiver.otlp "app" {
    grpc {}
    http {}
}
```

---

### Processor

**Mengolah data.**

Misalnya:

```text
OTLP
 │
 ▼
processor
 │
 ├── batch
 ├── filter
 ├── transform
 ├── attributes
 ├── resource
 └── sampling
```

Contohnya batch:

```alloy
otelcol.processor.batch "app" {
    output {
        traces = [...]
    }
}
```

---

### Exporter

**Mengirim ke tujuan.**

```text
processor
    │
    ▼
exporter
    │
    ├── Tempo
    ├── Loki
    ├── Mimir
    ├── Grafana Cloud
    └── other OTLP backend
```

Dalam OpenTelemetry Collector, exporter memang bertugas mengirim data ke backend/destination dan harus dihubungkan ke pipeline agar aktif. ([OpenTelemetry][4])

---

# 10. Contoh arsitektur production yang bagus

Misalnya kamu punya:

```text
                    Kubernetes
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       Go API         Go Worker       Go API
          │              │              │
          │ OTLP         │ OTLP         │ OTLP
          └──────────────┼──────────────┘
                         ▼
                ┌─────────────────┐
                │ Grafana Alloy   │
                │                 │
                │ receiver        │
                │ processor       │
                │ sampling        │
                │ batching        │
                └────────┬────────┘
                         │
             ┌───────────┼────────────┐
             ▼           ▼            ▼
           Tempo        Mimir        Loki
          Tracing      Metrics       Logs
             │           │            │
             └───────────┼────────────┘
                         ▼
                      Grafana
```

Dan Grafana menyarankan pola Alloy pada host untuk menghubungkan application observability dan infrastructure observability. ([Grafana Labs][3])

---

# 11. Ada satu hal yang perlu diluruskan

Kalau kamu membaca dokumentasi terbaru Alloy, kamu akan menemukan istilah:

```text
Default Engine
OTel Engine
```

Alloy sekarang punya dua runtime.

### Default Engine

Jalankan:

```bash
alloy run
```

Ini adalah engine Alloy utama dengan syntax:

```text
.alloy
```

dan memiliki fitur Grafana/Prometheus yang luas.

### OTel Engine

Jalankan:

```bash
alloy otel
```

Ini menjalankan **upstream OpenTelemetry Collector runtime** di dalam executable Alloy dan menggunakan konfigurasi Collector YAML. ([Grafana Labs][5])

Jadi secara konsep:

```text
Grafana Alloy
│
├── Default Engine
│      └── Alloy/River config
│
└── OTel Engine
       └── OpenTelemetry Collector config
```

Untuk kebanyakan deployment Alloy yang ingin memanfaatkan ekosistem Grafana, **Default Engine** adalah jalur utama yang stabil; OTel Engine ditujukan untuk workflow yang lebih native terhadap konfigurasi OpenTelemetry Collector. ([Grafana Labs][5])

---

# 12. Jadi kalau kamu pakai Go, stack-nya seperti ini

Saya akan membayangkan stack kamu:

```text
┌────────────────────────────────────────────┐
│                  Go App                   │
│                                            │
│  OpenTelemetry SDK                         │
│       │                                    │
│       ├── Trace                            │
│       ├── Metric                           │
│       └── Log                              │
└────────────────┬───────────────────────────┘
                 │
                 │ OTLP
                 │
                 ▼
┌────────────────────────────────────────────┐
│              Grafana Alloy                 │
│                                            │
│  Receiver                                  │
│      ↓                                     │
│  Processor                                 │
│      ↓                                     │
│  Batch / Filter / Transform / Sampling     │
│      ↓                                     │
│  Exporter                                  │
└───────────────┬───────────┬────────────────┘
                │           │
                ▼           ▼
             Tempo        Mimir
             Trace       Metrics
                │           │
                └─────┬─────┘
                      │
                      ▼
                   Grafana
```

**Inti yang perlu kamu ingat:**

> **OpenTelemetry = cara aplikasi menghasilkan + menstandarkan telemetry.**
> **OTLP = protokol untuk mengirim telemetry.**
> **Grafana Alloy = collector/agent yang menerima, memproses, dan meneruskan telemetry.**
> **Tempo/Mimir/Loki = tempat telemetry disimpan.**
> **Grafana = tempat kamu melihat/menganalisisnya.**

Dan yang paling penting: **Alloy bukan “versi Grafana dari OpenTelemetry SDK”.** Alloy lebih dekat dengan **OpenTelemetry Collector + Prometheus/Log/Profiling integrations**. ([Grafana Labs][2])

Kalau kamu mau menerapkannya di project **Go + Kubernetes**, pola yang sangat menarik untuk dipelajari berikutnya adalah **Go → OTel SDK → OTLP → Alloy → Tempo/Mimir/Loki**, termasuk contoh `docker-compose`/Kubernetes dan konfigurasi Alloy-nya.

---

# 13. Implementasi Praktis di Repository Ini

Dalam repository **URL Shortener** ini, OpenTelemetry (Traces, Metrics, Logs) dan Grafana Alloy telah diintegrasikan secara penuh:

### 13.1 Komponen Terpasang

1. **Tracer Initialization** ([tracer.go](file:///Users/sammidev/Developments/PETS/url-shortener/server/internal/platform/telemetry/tracer.go))
   - Menggunakan OpenTelemetry Go SDK dan `otlptracegrpc` exporter.
   - Mengirim span OTLP gRPC ke Grafana Alloy (`127.0.0.1:4317` atau `alloy:4317`).

2. **HTTP Tracing Middleware** ([tracing.go](file:///Users/sammidev/Developments/PETS/url-shortener/server/internal/platform/middleware/tracing.go))
   - Mengekstrak W3C `TraceContext` dari header masuk.
   - Membuat HTTP server span untuk setiap request dan menyuntikkan header `X-Trace-ID` pada response.

3. **Log-Trace Correlation** ([context.go](file:///Users/sammidev/Developments/PETS/url-shortener/server/internal/platform/logger/context.go))
   - Handler `log/slog` otomatis mencabut `trace_id` dan `span_id` dari context OpenTelemetry.
   - Menghasilkan Wide Event Structured Log yang dapat di-correlate secara presisi di Grafana (Tempo $\leftrightarrow$ Loki).

4. **Grafana Alloy Collector** ([config.alloy](file:///Users/sammidev/Developments/PETS/url-shortener/deploy/observability/alloy/config.alloy))
   - Menerima OTLP via gRPC (`:4317`) dan HTTP (`:4318`).
   - Memproses telemetry menggunakan `otelcol.processor.batch`.
   - Menulis Traces ke **Tempo**, Metrics ke **Prometheus**, dan Logs ke **Loki**.

5. **Observability Stack Compose** ([compose.observability.yml](file:///Users/sammidev/Developments/PETS/url-shortener/deploy/observability/compose.observability.yml))
   - Menjalankan **Grafana Alloy**, **Tempo**, **Loki**, **Prometheus**, dan **Grafana** (Port 3000).

### 13.2 Cara Menjalankan Observability Stack

```bash
# 1. Pastikan jaringan docker url_shortener_network sudah aktif
docker network create url-shortener_url_shortener_network 2>/dev/null || true

# 2. Jalankan stack Observability (Alloy + Tempo + Loki + Prometheus + Grafana)
docker compose -f deploy/observability/compose.observability.yml up -d

# 3. Akses Grafana Dashboard
# URL: http://localhost:3000 (User: admin / Pass: admin)
```

[1]: https://grafana.com/docs/alloy/latest/introduction/how-alloy-works/?utm_source=chatgpt.com "How Grafana Alloy works | Grafana Alloy documentation"
[2]: https://grafana.com/docs/alloy/latest/introduction/?utm_source=chatgpt.com "Introduction to Grafana Alloy | Grafana Alloy documentation"
[3]: https://grafana.com/docs/opentelemetry/collector/grafana-alloy/?utm_source=chatgpt.com "Set up Grafana Alloy for Application Observability | OpenTelemetry documentation"
[4]: https://opentelemetry.io/docs/collector/configuration/?utm_source=chatgpt.com "Configuration | OpenTelemetry"
[5]: https://grafana.com/docs/alloy/latest/introduction/otel_alloy/?utm_source=chatgpt.com "OpenTelemetry in Alloy | Grafana Alloy documentation"
