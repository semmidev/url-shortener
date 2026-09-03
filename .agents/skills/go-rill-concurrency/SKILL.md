---
name: go-rill-concurrency
description: Complete instructions and refactoring patterns for transforming Go concurrency boilerplate (goroutines, sync.WaitGroup, raw channels, worker pools, manual tickers, batching) into clean, composable, high-performance, and leak-free pipelines using the destel/rill library. Trigger when building concurrent pipelines, streaming data, batch processing, or refactoring Go concurrent code.
---

# Go Rill Concurrency Skill (`destel/rill`)

This Skill provides instructions, design patterns, and code transformation recipes for using **[destel/rill](https://github.com/destel/rill)** to handle stream processing, concurrent transformations, error handling, batching, and pipeline composition in Go.

## 🎯 When to Use Rill vs. Standard Go Concurrency

| Use Case / Scenario | Standard Go approach (`sync`, `chan`) | Rill Approach (`github.com/destel/rill`) |
| :--- | :--- | :--- |
| **Worker Pools / Parallel Mapping** | Manual `sync.WaitGroup`, worker loop, output channel | `rill.Map(stream, concurrency, fn)` |
| **Filtered Parallel Processing** | Select / loop + condition + worker channels | `rill.FilterMap(stream, concurrency, fn)` |
| **Paginated API / Multi-File Streaming** | Nested loops, manual channel fan-in | `rill.FlatMap(stream, concurrency, fn)` |
| **Time & Size-Based Batching** | `time.Ticker`, slice buffer, mutex / select logic | `rill.Batch(stream, batchSize, timeout)` |
| **Stream Duplication / Multi-Auditor** | Custom fan-out loops sending to N channels | `out1, out2 := rill.Tee(stream)` |
| **Stream Partitioning (By Predicate)** | Manual channel routing goroutines | `st1, st2 := rill.Split2(stream, concurrency, fn)` |
| **Error Recovery & DLQ** | Error channel collection, early return logic | `rill.Catch(stream, concurrency, fn)` |
| **Parallel Aggregations** | Mutex-protected accumulators or channel reduction | `rill.Reduce` or `rill.MapReduce` |

---

## 🛠 Refactoring Recipes (Code Transformations)

### Recipe 1: Worker Pool Transformation (`sync.WaitGroup` -> `rill.Map` / `rill.ForEach`)

#### ❌ BEFORE (Boilerplate Raw Channels & WaitGroups)
```go
func processUsers(ctx context.Context, userIDs []int) ([]*User, error) {
    jobs := make(chan int, len(userIDs))
    results := make(chan *User, len(userIDs))
    errChan := make(chan error, 1)

    var wg sync.WaitGroup
    for w := 0; w < 5; w++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for id := range jobs {
                user, err := fetchUser(ctx, id)
                if err != nil {
                    select {
                    case errChan <- err:
                    default:
                    }
                    return
                }
                results <- user
            }
        }()
    }

    for _, id := range userIDs {
        jobs <- id
    }
    close(jobs)

    wg.Wait()
    close(results)

    // Collect results...
}
```

#### ✅ AFTER (Clean & Idiomatic with Rill)
```go
import "github.com/destel/rill"

func processUsers(ctx context.Context, userIDs []int) ([]*User, error) {
    // 1. Create stream from slice
    stream := rill.FromSlice(userIDs, nil)

    // 2. Parallel processing with 5 concurrent workers
    userStream := rill.Map(stream, 5, func(id int) (*User, error) {
        return fetchUser(ctx, id)
    })

    // 3. Collect results safely into slice
    return rill.ToSlice(userStream)
}
```

---

### Recipe 2: Multi-File / Paginated API Streaming (`rill.FlatMap`)

When each input item expands into a stream of items (1-to-N transformation):

```go
// Convert slice of file paths into a continuous line-by-line stream
filePathsStream := rill.FromSlice(files, nil)

linesStream := rill.FlatMap(filePathsStream, 2, func(filePath string) <-chan rill.Try[string] {
    return rill.Generate(func(send func(string), sendErr func(error)) {
        file, err := os.Open(filePath)
        if err != nil {
            sendErr(err)
            return
        }
        defer file.Close()

        scanner := bufio.NewScanner(file)
        for scanner.Scan() {
            send(scanner.Text())
        }
    })
})
```

---

### Recipe 3: Real-Time Batching with Timeout (`rill.Batch`)

Groups stream items into slices of `batchSize`, but flushes early if `timeout` elapses:

```go
// Batch items up to 100 elements OR flush every 200ms
batchedStream := rill.Batch(inputStream, 100, 200*time.Millisecond)

err := rill.ForEach(batchedStream, 2, func(batch []MyItem) error {
    return db.BulkInsert(batch)
})
```

---

### Recipe 4: Error Interceptor & Dead-Letter Queue (`rill.Catch`)

Intercept errors mid-pipeline without cancelling the remaining stream processing:

```go
// Catch validation or processing errors
cleanStream := rill.Catch(validatedStream, 2, func(err error) error {
    log.Printf("[DLQ] Intercepted Error: %v -> Written to Dead-Letter Queue", err)
    // Return nil to absorb error and keep pipeline running!
    return nil
})
```

---

### Recipe 5: Stream Duplication for Parallel Auditing (`rill.Tee`)

Duplicate a single stream into two independent consuming streams:

```go
// Duplicate stream into two outputs
mainStream, auditStream := rill.Tee(inputStream)

var wg sync.WaitGroup
wg.Add(2)

// Main consumer
go func() {
    defer wg.Done()
    rill.ForEach(mainStream, 4, processMainTask)
}()

// Audit logger consumer
go func() {
    defer wg.Done()
    rill.ForEach(auditStream, 2, writeAuditLog)
}()

wg.Wait()
```

---

### Recipe 6: Parallel MapReduce Aggregations (`rill.MapReduce`)

Group and aggregate stream data concurrently across keys:

```go
// Group requests by status category and count total occurrences
statusCountsMap, err := rill.MapReduce(
    logStream,
    4, // mapper concurrency
    func(entry *LogEntry) (string, int, error) {
        return getStatusCategory(entry.StatusCode), 1, nil
    },
    2, // reducer concurrency
    func(count1, count2 int) (int, error) {
        return count1 + count2, nil
    },
)
```

---

### Recipe 7: Go 1.23 Iterator Integration (`rill.ToSeq2`)

Iterate over streams using native Go range loops:

```go
stream := rill.Map(inputStream, 3, processItem)

// Go 1.23 Range-over-function loop
for item, err := range rill.ToSeq2(stream) {
    if err != nil {
        log.Printf("Stream error: %v", err)
        break
    }
    fmt.Println(item)
}
```

---

## 🔒 Safety & Memory Rules (Goroutine Leak Prevention)

1. **Always Consume or Discard Streams**:
   - Every Rill stream MUST be consumed by a terminal function (`ToSlice`, `ForEach`, `Reduce`, `MapReduce`, `First`, `Err`, or `Discard`).
   - If breaking early out of a manual loop over a Rill stream channel, call `defer rill.Discard(stream)` to drain remaining items and prevent producer goroutines from leaking!

2. **Context Cancellation Awareness**:
   - Wrap long-running operations with `ctx, cancel := context.WithCancel(ctx)`.
   - In `rill.Generate` loops, always check `ctx.Err() != nil` to exit early when cancelled.

3. **Concurrency Sizing Guidelines**:
   - **I/O-Bound Work** (HTTP calls, DB queries): Set concurrency `n` higher (e.g., 5 to 50 depending on connection pool limits).
   - **CPU-Bound Work** (JSON parsing, crypto, compression): Set concurrency `n = runtime.NumCPU()`.
