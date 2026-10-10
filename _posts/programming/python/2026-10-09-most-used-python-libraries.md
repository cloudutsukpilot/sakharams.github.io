---
layout: post
title: "Most Used Python Libraries and Their Key Classes and Functions"
date: 2026-10-09 17:50:00 +0530
categories: [Programming, python]
tags: [Python, Standard Library, Libraries, PyPI, Cheat Sheet]
image: /assets/img/programming/python/most-used-python-libraries.webp
description: The Python libraries you'll use most, grouped by category, with the key classes and functions in each and what they're for, from pathlib and asyncio to pandas, FastAPI and boto3.
---

You need to read a config file, call an API, parse some dates and write a log line. In Python, every one of those
is already solved, often twice: once in the standard library and once on PyPI. The hard part isn't writing the
code, it's knowing which module to reach for and which three functions in it you'll actually use. This post is
the map I wish I'd had: the most commonly used libraries, grouped by job, with the classes and functions that
matter in each and a line or two on what they're for.

<!-- more -->

Libraries marked **stdlib** ship with Python, so there's nothing to install. Everything else is a third-party
package from PyPI, installed with `python -m pip install <name>` inside a virtual environment (see
[setting up virtual environments](/posts/programming/python/setup-virtual-environments-in-windows-and-linux/)).

## Quick reference: which library for which job

| I need to… | Reach for | Type |
|---|---|---|
| Work with files and paths | `pathlib`, `shutil`, `os` | stdlib |
| Run shell commands | `subprocess` | stdlib |
| Read or write JSON, CSV, TOML, YAML | `json`, `csv`, `tomllib`, PyYAML | stdlib / PyPI |
| Count, group, chain, cache | `collections`, `itertools`, `functools` | stdlib |
| Define simple data classes | `dataclasses`, `enum`, Pydantic | stdlib / PyPI |
| Match text patterns | `re` | stdlib |
| Handle dates, times and time zones | `datetime`, `zoneinfo` | stdlib |
| Log properly | `logging` | stdlib |
| Do things concurrently | `concurrent.futures`, `asyncio`, `multiprocessing` | stdlib |
| Build a command-line tool | `argparse`, Typer | stdlib / PyPI |
| Call HTTP APIs | Requests, HTTPX | PyPI |
| Crunch numbers and tables | NumPy, pandas | PyPI |
| Build a web API | FastAPI, Flask | PyPI |
| Talk to a database | `sqlite3`, SQLAlchemy | stdlib / PyPI |
| Write tests | pytest, `unittest.mock` | PyPI / stdlib |
| Automate the cloud | boto3, Azure SDK, Google Cloud client libraries | PyPI |

## Files, paths and the operating system

### pathlib (stdlib)

The modern way to work with filesystem paths. Paths are objects with methods instead of strings you glue
together, and the same code works on Windows and Linux. I'd use it over `os.path` in all new code.

- **`Path`**: represents a file or directory path. Join with `/` (`Path("logs") / "app.log"`), and inspect parts with `.name`, `.stem`, `.suffix` and `.parent`.
- **`Path.read_text()` / `Path.write_text()`**: read or write a whole text file in one call, with an `encoding` argument. Ideal for small config and data files.
- **`Path.glob()` / `Path.rglob()`**: find files matching a pattern, in one directory or recursively. Returns a generator of `Path` objects.
- **`Path.exists()`, `.is_file()`, `.mkdir(parents=True, exist_ok=True)`**: check and create paths without separate `os` calls.

```python
from pathlib import Path

logs = Path("logs")
logs.mkdir(exist_ok=True)
(logs / "app.log").write_text("started\n", encoding="utf-8")
for path in Path(".").rglob("*.py"):
    print(path.name, path.stat().st_size)
```

### os and sys (stdlib)

`os` is the interface to the operating system: environment variables, processes and low-level file operations.
`sys` exposes the interpreter itself: arguments, the module path and the standard streams.

- **`os.environ` / `os.getenv()`**: read environment variables. `os.getenv("PORT", "8080")` returns a default when it isn't set, and the value is always a string.
- **`os.walk()`**: walk a directory tree, yielding `(dirpath, dirnames, filenames)` for each folder. Still handy, though `Path.rglob()` is often simpler.
- **`sys.argv`**: the raw command-line arguments as a list of strings. Fine for quick scripts; use `argparse` for anything with options.
- **`sys.exit()` / `sys.path` / `sys.executable`**: exit with a status code, inspect where imports are searched, and see which interpreter is running. The last one is the first thing to check when an import mysteriously fails.

### shutil (stdlib)

High-level file operations that `os` doesn't provide: copying whole trees, moving and archiving.

- **`shutil.copy2()` / `shutil.copytree()`**: copy a file (keeping metadata) or an entire directory tree.
- **`shutil.move()` / `shutil.rmtree()`**: move files across filesystems, or delete a directory and everything in it. Double-check the path before calling `rmtree`.
- **`shutil.make_archive()` / `shutil.which()`**: create a zip or tar archive in one call, and find an executable on `PATH`, like the shell's `which`.

### subprocess (stdlib)

Runs external commands and captures their output. It replaces `os.system`, and with the right arguments it's
safer, because it doesn't need a shell at all.

- **`subprocess.run()`**: run a command and wait for it. Pass a list of arguments, use `capture_output=True, text=True` to get output as strings, and `check=True` to raise on a non-zero exit code.
- **`subprocess.CompletedProcess`**: the result of `run()`, with `.returncode`, `.stdout` and `.stderr`.
- **`subprocess.Popen`**: lower-level class for streaming output or talking to a long-running process interactively.
- **`subprocess.CalledProcessError`**: raised by `check=True` when a command fails. It carries the return code and output for your error message.

```python
import subprocess

result = subprocess.run(
    ["git", "rev-parse", "--short", "HEAD"],
    capture_output=True, text=True, check=True,
)
print(result.stdout.strip())
```

> Avoid `shell=True` with any user-supplied input. Passing a list of arguments without a shell removes a whole
> class of command-injection bugs.
{: .prompt-warning }

## Data formats

### json (stdlib)

Converts between JSON text and Python dicts, lists, strings, numbers, booleans and `None`. It's used in almost
every API client and config loader.

- **`json.loads()` / `json.dumps()`**: parse a JSON string, or produce one. `dumps(obj, indent=2)` pretty-prints; `default=str` handles types like `datetime` that JSON doesn't know.
- **`json.load()` / `json.dump()`**: the same, but reading from or writing to a file object.
- **`json.JSONDecodeError`**: raised on invalid JSON, with the line and column of the problem.

### csv (stdlib)

Reads and writes CSV correctly, including quoted fields with commas and newlines, which a naive `split(",")`
gets wrong.

- **`csv.DictReader`**: iterate over rows as dicts keyed by the header row. Usually the most readable option.
- **`csv.DictWriter`**: write dicts as rows; call `.writeheader()` first.
- **`csv.reader` / `csv.writer`**: the list-based versions, for files without headers. Open files with `newline=""`, as the docs recommend.

### tomllib (stdlib, 3.11+) and PyYAML

`tomllib` parses TOML, the format of `pyproject.toml`, and is read-only. PyYAML (`pip install pyyaml`) handles
YAML, which you'll meet in Kubernetes manifests, CI pipelines and Ansible.

- **`tomllib.load()` / `tomllib.loads()`**: parse TOML from a binary file (`open(path, "rb")`) or a string into a dict. To write TOML, use a third-party package such as `tomli-w`.
- **`yaml.safe_load()`**: parse YAML into Python objects. Always prefer it over `yaml.load()`, which can construct arbitrary objects from untrusted input.
- **`yaml.safe_dump()`**: write Python data as YAML; `sort_keys=False` keeps your key order.

### pickle (stdlib)

Serialises almost any Python object to bytes and back. It's convenient for caching between runs of your own
code and dangerous everywhere else.

- **`pickle.dump()` / `pickle.load()`**: write an object to a binary file, and read it back.
- **`pickle.dumps()` / `pickle.loads()`**: the same with bytes in memory.

> Never unpickle data from a source you don't fully trust. Loading a pickle can execute arbitrary code. For data
> that crosses a trust boundary, use JSON.
{: .prompt-danger }

## Data structures and functional tools

### collections (stdlib)

Specialised containers that replace a lot of hand-written dictionary code.

- **`Counter`**: counts hashable items. `Counter(words).most_common(3)` gives the top three in one line, and counters support `+` and `-`.
- **`defaultdict`**: a dict that creates a default value for missing keys, e.g. `defaultdict(list)` for grouping without `if key not in d` checks.
- **`deque`**: a double-ended queue with O(1) appends and pops at both ends. `deque(maxlen=100)` keeps a rolling window of the latest items.
- **`OrderedDict` / `namedtuple`**: `OrderedDict` still matters for `move_to_end()` (LRU caches). `namedtuple` creates lightweight immutable records, though dataclasses usually read better now.

```python
from collections import Counter, defaultdict

hits = Counter(["/home", "/api", "/home", "/login", "/home"])
print(hits.most_common(1))            # [('/home', 3)]

by_status = defaultdict(list)
for path, status in [("/a", 200), ("/b", 500), ("/c", 200)]:
    by_status[status].append(path)
print(dict(by_status))                # {200: ['/a', '/c'], 500: ['/b']}
```

### itertools (stdlib)

Building blocks for working with iterators lazily, so you can process big sequences without building lists.

- **`chain()`**: treat several iterables as one sequence; `chain.from_iterable()` flattens one level of nesting.
- **`groupby()`**: group consecutive items by a key. The input must already be sorted by that key, or you'll get split groups. This catches everyone once.
- **`islice()`**: slice any iterator (including generators and files) without converting it to a list.
- **`product()`, `permutations()`, `combinations()`**: generate combinations for tests, grid searches and puzzles. `batched()` (3.12+) splits an iterable into fixed-size chunks.

### functools (stdlib)

Tools for working with functions: caching, partial application and decorator support.

- **`lru_cache()` / `cache()`**: memoise a function's results by its arguments. Great for expensive pure functions, but be careful using it on methods (it keeps `self` alive).
- **`partial()`**: create a new function with some arguments pre-filled, e.g. `partial(int, base=2)`.
- **`wraps()`**: use inside every decorator so the wrapped function keeps its name and docstring.
- **`reduce()` / `cached_property`**: fold a sequence into one value (a plain loop is often clearer), and compute an attribute once per instance, then cache it.

### dataclasses and enum (stdlib)

`dataclasses` writes the boilerplate for classes that mostly hold data. `enum` gives names to a fixed set of
values instead of scattering magic strings.

- **`@dataclass`**: generates `__init__`, `__repr__` and `__eq__` from type-annotated fields. Options such as `frozen=True`, `slots=True` and `order=True` add immutability, lower memory use and sorting.
- **`field()`**: customises a field, most often `field(default_factory=list)` for mutable defaults.
- **`asdict()`**: converts a dataclass instance, including nested ones, into a dict, for JSON output.
- **`Enum` / `StrEnum` / `auto()`**: define named constants. `StrEnum` (3.11+) members compare equal to strings, which is handy for config values and API fields.

### typing (stdlib)

Type hints aren't enforced at runtime, but they make code self-documenting and let tools such as mypy, Pyright
and your editor catch bugs before you run anything.

- **Built-in generics and `|`**: write `list[str]`, `dict[str, int]` and `str | None` directly (3.9+ and 3.10+). You rarely need `List` or `Optional` imports any more.
- **`TypedDict`**: describes the shape of a dict with known keys, such as a JSON payload, without converting it to a class.
- **`Protocol`**: structural typing. Any class with the right methods matches, which is duck typing a type checker can verify.
- **`Literal` / `Callable` / `Any`**: restrict a value to specific constants, type a function argument, and opt out of checking where you must.

## Text and regular expressions

### re (stdlib)

Regular expressions for searching, validating and extracting text. Use raw strings (`r"..."`) for patterns so
backslashes aren't swallowed.

- **`re.search()` / `re.match()` / `re.fullmatch()`**: find a pattern anywhere, only at the start, or require the whole string to match. All return a `Match` object or `None`.
- **`re.findall()` / `re.finditer()`**: return all matches as a list, or lazily as `Match` objects with positions.
- **`re.sub()`**: replace matches, with a string or a function that computes each replacement.
- **`re.compile()` / `Match.group()`**: precompile a pattern you'll reuse, and pull out captured groups by number or by name (`(?P<name>...)`).

```python
import re

line = '10.0.0.7 - - [09/Oct/2026:10:15:32] "GET /api/orders HTTP/1.1" 500'
m = re.search(r'^(?P<ip>\S+) .* "(?P<method>\w+) (?P<path>\S+) .*" (?P<status>\d{3})$', line)
print(m.group("ip"), m.group("path"), m.group("status"))   # 10.0.0.7 /api/orders 500
```

## Dates and times

### datetime and zoneinfo (stdlib)

`datetime` represents dates, times and durations. `zoneinfo` (3.9+) adds real IANA time zones such as
`Asia/Kolkata`, so you no longer need `pytz`.

- **`datetime`**: a date plus a time. Use `datetime.now(timezone.utc)` for an aware UTC timestamp. `datetime.utcnow()` is deprecated since 3.12 because it returns a naive value that's easy to misinterpret.
- **`timedelta`**: a duration you can add or subtract, e.g. `now - timedelta(days=7)`.
- **`datetime.fromisoformat()` / `.isoformat()`**: parse and produce ISO 8601 strings. `strftime()` and `strptime()` handle custom formats.
- **`ZoneInfo`**: attach or convert to a named time zone with `dt.astimezone(ZoneInfo("Asia/Kolkata"))`. It handles daylight-saving rules correctly.

```python
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

now = datetime.now(timezone.utc)
print(now.astimezone(ZoneInfo("Asia/Kolkata")).isoformat())
print((now - timedelta(days=7)).date())
```

> Store and compare timestamps in UTC, and convert to local time only for display. Mixing naive and aware
> datetimes raises `TypeError: can't compare offset-naive and offset-aware datetimes`.
{: .prompt-tip }

### time (stdlib)

Lower-level clocks, mostly used for measuring and waiting.

- **`time.perf_counter()`**: a high-resolution clock for measuring elapsed time. Use it for benchmarks.
- **`time.monotonic()`**: a clock that never goes backwards, for timeouts and rate limiters. Wall-clock `time.time()` can jump when the system clock changes.
- **`time.sleep()`**: pause the current thread. Never call it inside async code; use `await asyncio.sleep()` there.

## Logging and debugging

### logging (stdlib)

The standard way to emit diagnostic messages with levels, timestamps and pluggable destinations. Libraries use
it too, so configuring it once controls everything.

- **`logging.getLogger(__name__)`**: get a module-level logger named after your module. Do this at the top of every module instead of calling `logging.info()` directly.
- **`logging.basicConfig()`**: one-line setup of level, format and output for scripts. Larger apps use `logging.config.dictConfig()`.
- **`Logger.debug/info/warning/error/exception()`**: log at a level. `exception()` inside an `except` block adds the full traceback.
- **`Handler` / `Formatter`**: send logs to the console, files (`RotatingFileHandler`) or elsewhere, in plain text or JSON.

```python
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)

try:
    1 / 0
except ZeroDivisionError:
    log.exception("Calculation failed for order_id=%s", 42)
```

Pass values as arguments (`"order_id=%s", 42`) rather than building f-strings, so the message is only formatted if
the level is enabled.

### pdb and traceback (stdlib)

- **`breakpoint()`**: a built-in that drops you into the `pdb` debugger at that line. Step with `n`, step into calls with `s`, print with `p`, continue with `c`.
- **`traceback.format_exc()`**: the current exception's traceback as a string, for custom error reports.

## Concurrency and parallelism

### concurrent.futures (stdlib)

The simplest way to run work in parallel, with one interface for threads and processes.

- **`ThreadPoolExecutor`**: runs functions in a pool of threads. Best for I/O-bound work such as HTTP calls and file reads, where threads spend most of their time waiting.
- **`ProcessPoolExecutor`**: runs functions in separate processes, so CPU-bound work uses all cores despite the GIL. Arguments and results must be picklable.
- **`Executor.map()` / `Executor.submit()`**: map a function over inputs in order, or submit tasks individually and get `Future` objects.
- **`as_completed()`**: yields futures as they finish, so you can handle results as soon as they arrive.

```python
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen

urls = ["https://www.python.org", "https://pypi.org"]

def status(url):
    with urlopen(url, timeout=10) as resp:
        return url, resp.status

with ThreadPoolExecutor(max_workers=8) as pool:
    for url, code in pool.map(status, urls):
        print(url, code)
```

### asyncio (stdlib)

Single-threaded concurrency with `async`/`await`, for programs that juggle thousands of network connections.

- **`asyncio.run()`**: start the event loop and run your top-level coroutine. Call it once, at the entry point.
- **`asyncio.TaskGroup`** (3.11+): run several coroutines concurrently. If one fails, the others are cancelled and errors are raised together.
- **`asyncio.gather()`**: the older way to run coroutines concurrently and collect results; `return_exceptions=True` keeps going after failures.
- **`asyncio.Semaphore` / `asyncio.timeout()` / `asyncio.to_thread()`**: limit concurrency, apply a deadline, and run a blocking function in a thread without freezing the loop.

### threading and multiprocessing (stdlib)

The lower-level modules underneath the executors. Reach for them when you need finer control.

- **`threading.Thread` / `threading.Lock`**: start a thread manually, and protect shared state. Remember that `x += 1` isn't atomic across threads.
- **`queue.Queue`**: a thread-safe queue for producer-consumer patterns between threads.
- **`multiprocessing.Process` / `multiprocessing.Pool`**: separate processes with their own memory, for CPU-bound work.

## Command-line tools and configuration

### argparse (stdlib)

Parses command-line options, validates them and generates `--help` output for free.

- **`ArgumentParser`**: the parser object. Give it a `description`, and it builds usage and help text.
- **`add_argument()`**: declare positional arguments and options, with `type=`, `default=`, `choices=`, `required=` and `action="store_true"` for flags.
- **`add_subparsers()`**: build git-style subcommands (`tool deploy`, `tool status`).
- **`parse_args()`**: parse `sys.argv` and return a namespace with an attribute per option.

```python
import argparse

parser = argparse.ArgumentParser(description="Deploy a service")
parser.add_argument("service")
parser.add_argument("--env", choices=["dev", "staging", "prod"], default="dev")
parser.add_argument("--dry-run", action="store_true")
args = parser.parse_args(["payments", "--env", "staging", "--dry-run"])
print(args.service, args.env, args.dry_run)   # payments staging True
```

### Typer and Click

Third-party CLI frameworks. Click uses decorators; Typer (built on Click) reads your function's type hints, so a
typed function becomes a CLI with almost no extra code.

- **`typer.Typer()` / `@app.command()`**: create an app and turn functions into subcommands. Parameters with defaults become options, and those without become arguments.
- **`typer.Option()` / `typer.Argument()`**: add help text, environment-variable fallbacks and validation.
- **`click.command()` / `click.option()`**: the Click equivalents, if you prefer explicit decorators.

### python-dotenv

Loads `KEY=value` pairs from a `.env` file into the environment, which is the usual way to keep local secrets out
of code.

- **`load_dotenv()`**: reads `.env` and sets `os.environ` (without overriding existing variables by default).
- **`dotenv_values()`**: returns the values as a dict *without* touching `os.environ`. Useful, but a common source of "my variable isn't set" confusion if you expected `os.getenv()` to see it.

## HTTP and APIs

### Requests

The most popular HTTP client. A simple, synchronous API that covers 90% of what scripts need.

- **`requests.get()` / `requests.post()`**: one-off requests. Pass `params=` for query strings, `json=` for a JSON body, and always a `timeout=`, because there's no default.
- **`requests.Session`**: reuses connections and keeps headers, cookies and auth across calls. Much faster when you make many requests to the same host.
- **`Response.raise_for_status()` / `.json()`**: raise an `HTTPError` for 4xx and 5xx responses, and parse the body as JSON.
- **`requests.exceptions.RequestException`**: the base class for connection errors, timeouts and HTTP errors, for a single `except`.

```python
import requests

with requests.Session() as session:
    session.headers["Accept"] = "application/json"
    resp = session.get("https://api.github.com/repos/python/cpython", timeout=10)
    resp.raise_for_status()
    print(resp.json()["stargazers_count"])
```

### HTTPX

A modern client with a Requests-like API that also supports async and HTTP/2. My default for new code that might
go async.

- **`httpx.Client`**: the synchronous equivalent of a Requests session, with timeouts set by default.
- **`httpx.AsyncClient`**: `await client.get(...)` inside asyncio code, with connection pooling.
- **`httpx.HTTPStatusError` / `httpx.Timeout`**: errors from `raise_for_status()`, and fine-grained timeout settings (connect, read, write, pool).

## Data and numbers

### NumPy

Fast n-dimensional arrays and the vectorised maths underneath almost the entire data and ML ecosystem. Operations
run in compiled code over whole arrays, so you avoid Python loops.

- **`numpy.array()` / `numpy.ndarray`**: create arrays from lists. Every element has the same `dtype`, which is what makes them fast and compact.
- **`arange()`, `linspace()`, `zeros()`, `ones()`**: create ranges and pre-filled arrays.
- **`reshape()`, indexing and boolean masks**: reshape without copying, slice in several dimensions, and filter with expressions like `a[a > 0]`.
- **Aggregations and the `random` module**: `sum()`, `mean()` and `std()` along any axis, and `np.random.default_rng()` for random numbers.

### pandas

Labelled tables (DataFrames) for loading, cleaning, joining and summarising data. It's the Swiss Army knife of
data work in Python.

- **`DataFrame` / `Series`**: a table with named columns, and a single labelled column.
- **`read_csv()`, `read_parquet()`, `read_sql()`, `to_csv()`**: load and save data in common formats with type inference.
- **`groupby()` + `agg()`**: split-apply-combine summaries, e.g. total sales by region and month.
- **`merge()`, `loc[]`, `query()`**: SQL-style joins, label-based selection and readable filtering.

```python
import pandas as pd

df = pd.DataFrame({
    "region": ["APAC", "EU", "APAC", "US"],
    "orders": [120, 90, 80, 150],
})
print(df.groupby("region")["orders"].sum().sort_values(ascending=False))
```

> For files bigger than memory, pandas struggles. Look at Polars (a fast, lazy DataFrame library) or DuckDB
> (SQL directly on CSV and Parquet files) before reaching for a cluster.
{: .prompt-info }

### Matplotlib

The foundational plotting library. Seaborn and pandas' `.plot()` are built on it.

- **`pyplot.subplots()`**: create a figure and one or more axes, the recommended starting point.
- **`Axes.plot()`, `.bar()`, `.scatter()`, `.hist()`**: the main chart types, drawn on an axes object.
- **`Figure.savefig()`**: save to PNG, SVG or PDF; `dpi=` controls resolution for reports.

## Web frameworks and data validation

### FastAPI

A modern framework for building APIs from type-hinted functions. It validates requests and generates
interactive OpenAPI docs automatically.

- **`FastAPI()`**: the application object. Run it with an ASGI server such as Uvicorn (`fastapi dev main.py` during development).
- **`@app.get()`, `@app.post()`** and friends: route decorators. Path and query parameters come straight from the function signature.
- **`Depends()`**: dependency injection for database sessions, auth checks and shared settings.
- **`HTTPException`**: raise to return an error status and message to the client.

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class Order(BaseModel):
    item: str
    quantity: int

orders: dict[int, Order] = {}

@app.post("/orders/{order_id}", status_code=201)
def create_order(order_id: int, order: Order) -> Order:
    if order_id in orders:
        raise HTTPException(status_code=409, detail="Order exists")
    orders[order_id] = order
    return order
```

### Flask

A lightweight, mature web framework. It's minimal by default, with extensions for everything else, and still
very common for small services and internal tools.

- **`Flask(__name__)`**: create the app.
- **`@app.route()`**: map URLs and HTTP methods to view functions.
- **`request` / `jsonify()`**: read the incoming request (args, JSON, form data), and return JSON responses.

### Pydantic

Data validation using type hints. It parses untrusted input (API payloads, config, environment variables) into
typed objects and gives clear errors when the data is wrong.

- **`BaseModel`**: define a schema as a class with annotated fields. Instances are validated on creation.
- **`model_validate()` / `model_dump()` / `model_dump_json()`**: validate a dict into a model, and turn a model back into a dict or JSON (Pydantic v2 names).
- **`Field()`**: add constraints and metadata, e.g. `Field(gt=0, max_length=50)`.
- **`ValidationError`**: lists every field that failed and why. `pydantic-settings`' `BaseSettings` loads typed config from environment variables.

## Databases

### sqlite3 (stdlib)

A full SQL database in a single file, built into Python. It's perfect for local tools, tests, caches and
prototypes.

- **`sqlite3.connect()`**: open (or create) a database file; `":memory:"` gives a throwaway in-memory database.
- **`Connection.execute()`**: run SQL with `?` placeholders for parameters. Never format values into SQL strings.
- **`Cursor.fetchone()` / `fetchall()`**: read query results. Set `conn.row_factory = sqlite3.Row` to access columns by name.
- **`with conn:`**: commits the transaction on success and rolls back on an exception.

### SQLAlchemy

The standard database toolkit and ORM for Python. It works with PostgreSQL, MySQL, SQL Server, SQLite and more.
Version 2.0 uses a cleaner, fully typed style.

- **`create_engine()`**: manages connections and the connection pool for a database URL.
- **`DeclarativeBase`, `Mapped`, `mapped_column()`**: define ORM models as typed classes.
- **`Session`**: a unit of work. Add objects, query, then `commit()`. Use it as a context manager.
- **`select()`**: build queries in Python (`select(User).where(User.active)`), executed with `session.scalars()`.

## Testing

### pytest

The de facto testing framework. Plain `assert` statements, automatic test discovery and a huge plugin
ecosystem.

- **Test functions and `assert`**: any `test_*` function in a `test_*.py` file is a test, and failed asserts show the values involved.
- **`@pytest.fixture`**: reusable setup and teardown (database connections, temporary data), injected by naming the fixture as a parameter.
- **`@pytest.mark.parametrize`**: run one test over many inputs without copy-paste.
- **`pytest.raises()` / built-in fixtures**: assert that code raises an exception. `tmp_path` gives each test a temporary directory, and `monkeypatch` swaps attributes or environment variables.

```python
import pytest

def apply_discount(price, pct):
    if not 0 <= pct <= 100:
        raise ValueError("pct must be 0-100")
    return round(price * (1 - pct / 100), 2)

@pytest.mark.parametrize("price, pct, expected", [(100, 10, 90.0), (59.99, 0, 59.99)])
def test_apply_discount(price, pct, expected):
    assert apply_discount(price, pct) == expected

def test_rejects_bad_pct():
    with pytest.raises(ValueError):
        apply_discount(100, 150)
```

### unittest and unittest.mock (stdlib)

`unittest` is the built-in, class-based framework, and pytest runs its tests too. `unittest.mock` is used with
both, to replace real dependencies in tests.

- **`unittest.TestCase`**: group tests as methods, with `setUp()` and `assertEqual()`-style assertions.
- **`unittest.mock.patch()`**: temporarily replace an object (an HTTP call, the clock) during a test. Patch where it's *looked up*, not where it's defined.
- **`Mock` / `MagicMock`**: fake objects that record how they were called; check with `assert_called_once_with()`.

## Cloud and DevOps automation

### boto3 (AWS)

The AWS SDK for Python, used for scripting anything in AWS from S3 uploads to EC2 inventories.

- **`boto3.client()`**: a low-level client per service (`boto3.client("s3")`) whose methods map one-to-one to AWS API operations.
- **`boto3.Session`**: holds credentials, profile and region. Create one per profile or role instead of relying on global defaults.
- **`client.get_paginator()`**: iterates over results that span many pages (S3 listings, EC2 instances). Forgetting pagination is the classic "only 1,000 objects returned" bug.
- **`botocore.exceptions.ClientError`**: raised for AWS API errors. Check `e.response["Error"]["Code"]` to handle specific cases.

```python
import boto3

s3 = boto3.Session(profile_name="dev").client("s3")
paginator = s3.get_paginator("list_objects_v2")
for page in paginator.paginate(Bucket="my-bucket", Prefix="logs/"):
    for obj in page.get("Contents", []):
        print(obj["Key"], obj["Size"])
```

### Azure SDK for Python

Microsoft's SDK is split into one package per service, all sharing the same authentication library.

- **`azure.identity.DefaultAzureCredential`**: tries environment variables, workload or managed identity, Azure CLI login and more, in order. One credential class that works on your laptop and in production.
- **Service clients** such as `BlobServiceClient` (azure-storage-blob), `SecretClient` (azure-keyvault-secrets) and `ResourceManagementClient`: each takes an endpoint and a credential.
- **`azure.core.exceptions.ResourceNotFoundError` / `HttpResponseError`**: shared error types across all the SDKs.

### Google Cloud client libraries

One package per service (`google-cloud-storage`, `google-cloud-bigquery` and so on), authenticated with
Application Default Credentials.

- **`storage.Client()`**: Cloud Storage client, using `bucket()` and `blob()` to read and write objects.
- **`bigquery.Client()`**: run queries with `client.query(sql).result()` and load data into tables.
- **`google.auth.default()`**: resolves Application Default Credentials (`gcloud auth application-default login` locally, service accounts in the cloud).

### Jinja2

A templating engine for generating text: HTML pages, config files, Kubernetes manifests. Flask and Ansible use it
under the hood.

- **`Environment` + `FileSystemLoader`**: load templates from a directory with consistent settings (`autoescape` for HTML, `StrictUndefined` to fail on missing variables).
- **`Template.render()`**: fill a template with variables. `{% raw %}{{ var }}{% endraw %}` prints a value, and `{% raw %}{% for %}{% endraw %}` and `{% raw %}{% if %}{% endraw %}` add logic.

## Common pitfalls

- **Installing into the wrong interpreter.** `pip install` succeeded but the import fails? Use `python -m pip`, and check `sys.executable`. There's more in the [No module named post](/posts/programming/python/python-no-module-named/).
- **Naming your file after a library.** A local `requests.py`, `json.py` or `random.py` shadows the real module, with baffling errors as a result.
- **Missing timeouts.** Requests and `urlopen` will wait forever by default on a stuck connection. Always set `timeout=`.
- **Naive datetimes.** Use aware UTC timestamps and `zoneinfo`, and avoid the deprecated `datetime.utcnow()`.
- **Reinventing the standard library.** Before writing a helper, check `collections`, `itertools`, `functools` and `pathlib`. It's probably there, tested and faster.
- **Unpinned dependencies.** Third-party APIs change between major versions (Pydantic v1 to v2, SQLAlchemy 1.x to 2.0). Lock your versions.

## Conclusion

You don't need to know hundreds of libraries. A couple of dozen cover most real-world Python: `pathlib`,
`subprocess`, `json`, `collections`, `datetime`, `logging` and `concurrent.futures` from the standard library,
plus Requests or HTTPX, pandas, Pydantic, FastAPI, SQLAlchemy, pytest and your cloud's SDK from PyPI. Learn the
handful of classes and functions listed for each and you'll recognise them in almost any codebase. A good next
step: pick one script you've written recently and see which hand-rolled helpers could be replaced by something
on this list. If you're preparing for interviews, the
[Python interview questions](/posts/programming/python/python-interview-questions/) cover several of these
modules in depth.

## References

- [The Python Standard Library](https://docs.python.org/3/library/index.html)
- [pathlib](https://docs.python.org/3/library/pathlib.html), [subprocess](https://docs.python.org/3/library/subprocess.html), [logging HOWTO](https://docs.python.org/3/howto/logging.html), [asyncio](https://docs.python.org/3/library/asyncio.html)
- [Requests documentation](https://requests.readthedocs.io/)
- [HTTPX documentation](https://www.python-httpx.org/)
- [pandas documentation](https://pandas.pydata.org/docs/)
- [FastAPI documentation](https://fastapi.tiangolo.com/)
- [Pydantic documentation](https://docs.pydantic.dev/)
- [SQLAlchemy 2.0 documentation](https://docs.sqlalchemy.org/en/20/)
- [pytest documentation](https://docs.pytest.org/)
- [Boto3 documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html)
- [Azure SDK for Python](https://learn.microsoft.com/azure/developer/python/sdk/azure-sdk-overview)
