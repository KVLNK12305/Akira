import autocannon from 'autocannon';

const url = 'http://localhost:' + (process.env.PORT || 5000);

const instance = autocannon({
  url: url,
  connections: 100,
  pipelining: 1,
  duration: 10
}, (err, result) => {
  if (err) {
    console.error('Error running benchmark:', err);
  } else {
    console.log('\n--- Benchmark Results ---');
    console.log(`URL: ${url}`);
    console.log(`Duration: ${result.duration}s`);
    console.log(`Total Requests: ${result.requests.total}`);
    console.log(`Requests/sec: ${result.requests.average}`);
    console.log(`Latency (avg): ${result.latency.average} ms`);
    console.log(`2xx Responses: ${result['2xx']}`);
    console.log(`Non-2xx Responses: ${result.non2xx}`);
    console.log(`Errors: ${result.errors}`);
  }
});

autocannon.track(instance, { renderProgressBar: true });
