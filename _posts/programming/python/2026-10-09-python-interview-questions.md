---
layout: post
title: "Python Interview Questions"
date: 2026-10-09 01:00:00 +0530
categories: [Programming, python]
tags: [Python, Interview Questions, Asyncio, Concurrency, Coding]
image: /assets/img/programming/python/python-interview-questions.webp
description: Python interview questions from beginner to advanced - core concepts, real-world debugging scenarios and coding exercises with worked answers and runnable code.
interview_domain: programming
interview_topic: Python
interview_sections:
  "Beginner: Coding": { topic: Python Coding }
  "Intermediate: Coding": { topic: Python Coding }
  "Advanced: Coding": { topic: Python Coding }
---

## Python Interview Questions

"What does this print?" followed by a five-line snippet with a mutable default argument. That question has
ended more Python interviews than any algorithm puzzle, because it tests whether you understand how the
language actually works rather than whether you've memorised syntax. This bank collects the questions that
come up again and again, grouped by level, and split three ways: **concepts** (explain how it works),
**scenarios** (something is broken in production, what do you do) and **coding** (write it, with runnable
answers).

- **Beginner**: the data model, built-in types, functions and the gotchas every Python developer hits in their first months.
- **Intermediate**: decorators, generators, context managers, closures, exceptions, and day-to-day debugging and packaging.
- **Advanced**: the GIL and free threading, memory management, asyncio internals, metaclasses and descriptors, and production performance problems.

<!-- more -->

Pick a level to jump to its questions:

{% include interview-tiles.html %}

If you're newer to the language, [Python at a Glance](/posts/programming/python/python-at-a-glance/) explains what
happens when you run your code, which answers several of the beginner questions below on its own. Other interview
question banks: [DevOps](/posts/devops/interview%20questions/devops-interview-questions/),
[SRE](/posts/devops/sre/sre-interview-questions/), [Cloud](/posts/cloud/cloud-interview-questions/),
[Kubernetes](/posts/devops/orchestration/kuberentes/kuberentes-interview-questions/), and
[all questions by domain and difficulty](/tags/interview-questions/).

## Beginner

### Beginner: Concepts

1. What's the difference between mutable and immutable types, and why does it matter?

    - **Immutable**: `int`, `float`, `bool`, `str`, `tuple`, `frozenset`, `bytes`. "Changing" one creates a new object
    - **Mutable**: `list`, `dict`, `set`, `bytearray` and most user-defined objects. They change in place
    - Only hashable (in practice, immutable) objects can be dict keys or set members. A `tuple` of lists isn't hashable
    - Mutability is behind the classic bugs: shared default arguments, aliasing (`b = a` doesn't copy a list), and modifying a list while iterating over it

    ```python
    s = "hello"
    t = s.upper()      # new string; s is unchanged
    a = [1, 2]
    b = a              # same list, two names
    b.append(3)
    print(a)           # [1, 2, 3]
    ```

2. What's the difference between `is` and `==`?

    - `==` compares **values** (calls `__eq__`). `is` compares **identity** (same object in memory, `id(a) == id(b)`)
    - Use `is` only for singletons: `None`, `True`, `False`, and sentinel objects
    - CPython caches small integers (-5 to 256) and interns some strings, so `a is b` can be `True` for equal ints or strings by accident. Never rely on it. Python 3.8+ emits a `SyntaxWarning` for `x is 5`

    ```python
    a = [1, 2]
    b = [1, 2]
    print(a == b, a is b)   # True False
    ```

3. When would you use a list, tuple, set or dict?

    | Type | Ordered | Mutable | Duplicates | Lookup | Use for |
    |---|---|---|---|---|---|
    | `list` | Yes | Yes | Yes | O(n) by value | Sequences you append to or reorder |
    | `tuple` | Yes | No | Yes | O(n) | Fixed records, dict keys, return values |
    | `set` | No | Yes | No | O(1) average | Membership tests, de-duplication, set algebra |
    | `dict` | Insertion order (3.7+) | Yes | Unique keys | O(1) average by key | Mapping keys to values |

    - A common performance fix in interviews: replace `if x in big_list` inside a loop with a `set`

4. How does Python pass arguments to functions: by value or by reference?

    - Neither, exactly. Python passes **references to objects** ("call by sharing"). The parameter name is bound to the same object the caller passed
    - Mutating a mutable argument (`lst.append(1)`) is visible to the caller
    - Rebinding the parameter (`lst = [9]`) only changes the local name, not the caller's variable

    ```python
    def mutate(lst):
        lst.append(4)      # caller sees this

    def rebind(lst):
        lst = [9]          # caller doesn't see this

    nums = [1, 2, 3]
    mutate(nums)
    rebind(nums)
    print(nums)            # [1, 2, 3, 4]
    ```

5. What are `*args` and `**kwargs`, and what are keyword-only and positional-only parameters?

    - `*args` collects extra positional arguments into a tuple; `**kwargs` collects extra keyword arguments into a dict
    - Parameters after `*` (or `*args`) are **keyword-only**; parameters before `/` are **positional-only** (3.8+)
    - The same syntax unpacks at the call site: `f(*items, **options)`

    ```python
    def connect(host, /, port=5432, *, timeout=5, **extra):
        return host, port, timeout, extra

    connect("db", 5433, timeout=10, sslmode="require")
    # connect(host="db")  -> TypeError: host is positional-only
    ```

6. What does `if __name__ == "__main__":` do?

    - Every module has a `__name__`. It's `"__main__"` when the file is run directly, and the module's import name when it's imported
    - Code under the guard runs only when executed as a script, so the module can also be imported (by tests or other code) without side effects
    - More detail in the [Python entrypoint post](/posts/programming/python/python-entrypoint-explained/)

7. What's the difference between a shallow copy and a deep copy?

    - A **shallow copy** (`list(a)`, `a.copy()`, `a[:]`, `copy.copy(a)`) creates a new outer container, but nested objects are shared
    - A **deep copy** (`copy.deepcopy(a)`) recursively copies nested objects too, and handles cycles
    - Deep copies are slower and can copy things you didn't mean to (open files, locks). Prefer building new structures explicitly when you can

    ```python
    import copy
    grid = [[0, 0], [0, 0]]
    shallow = copy.copy(grid)
    deep = copy.deepcopy(grid)
    grid[0][0] = 1
    print(shallow[0][0], deep[0][0])   # 1 0
    ```

### Beginner: Scenarios

1. A helper that adds items to a list keeps returning items from previous calls. What's going on?

    - Default argument values are evaluated **once**, when the function is defined, not on every call. A mutable default is shared by every call
    - Fix: use `None` as the default and create a new object inside the function
    - Linters flag this (Ruff `B006`, Pylint `dangerous-default-value`). Turn those rules on

    ```python
    def add_tag(tag, tags=[]):        # bug: one shared list
        tags.append(tag)
        return tags

    add_tag("a")
    print(add_tag("b"))               # ['a', 'b']

    def add_tag_fixed(tag, tags=None):
        if tags is None:
            tags = []
        tags.append(tag)
        return tags
    ```

2. `pip install requests` succeeded, but `import requests` fails with `ModuleNotFoundError`. How do you troubleshoot?

    - The package went into a **different interpreter** from the one running your code
    - Check which Python runs the script and which pip installed it: `python -c "import sys; print(sys.executable)"` and `python -m pip --version`
    - Always install with `python -m pip install ...` so pip matches the interpreter, and activate the right virtual environment
    - In an IDE or Jupyter, check the selected interpreter or kernel (see [what ipykernel is](/posts/programming/python/what-is-ipykernel/))
    - Other causes: a local file named `requests.py` shadowing the package, or running from the wrong directory. There's a full walkthrough in the [No module named post](/posts/programming/python/python-no-module-named/)

3. A loop that removes invalid entries from a list leaves some of them behind. Why?

    - Removing items while iterating shifts the remaining elements left, so the iterator skips the element after each removal
    - Fix: build a new list with a comprehension, or iterate over a copy

    ```python
    nums = [1, 2, 2, 3]
    for n in nums:
        if n == 2:
            nums.remove(n)
    print(nums)                       # [1, 2, 3]: one 2 survived

    nums = [1, 2, 2, 3]
    nums = [n for n in nums if n != 2]
    print(nums)                       # [1, 3]
    ```

4. An invoice total comes out as `0.30000000000000004` instead of `0.3`. What do you do?

    - Floats are binary (IEEE 754) and can't represent most decimal fractions exactly, so `0.1 + 0.2 != 0.3`
    - For money, use `decimal.Decimal` built from **strings**, or store integer minor units (cents/paise)
    - For comparisons of measured values, use `math.isclose()` rather than `==`

    ```python
    from decimal import Decimal, ROUND_HALF_UP
    total = Decimal("0.10") + Decimal("0.20")
    print(total)                                          # 0.30
    print((Decimal("2.675")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))   # 2.68
    ```

### Beginner: Coding

1. Count how often each word appears in a text, ignoring case and punctuation, and return the top three.

    - `re.findall` handles tokenising; `collections.Counter` does the counting and ranking
    - Mention the manual `dict` version too. Interviewers sometimes want to see you can do it without `Counter`

    ```python
    import re
    from collections import Counter

    def top_words(text, n=3):
        words = re.findall(r"[a-z']+", text.lower())
        return Counter(words).most_common(n)

    print(top_words("The cat and the hat. The cat sat!"))
    # [('the', 3), ('cat', 2), ('and', 1)]
    ```

2. Check whether a string is a palindrome, ignoring case, spaces and punctuation.

    ```python
    def is_palindrome(s):
        cleaned = [c.lower() for c in s if c.isalnum()]
        return cleaned == cleaned[::-1]

    print(is_palindrome("A man, a plan, a canal: Panama"))   # True
    print(is_palindrome("cloudutsuk"))                       # False
    ```

    - Follow-up: do it in O(1) extra space with two pointers moving inwards and skipping non-alphanumerics

3. Remove duplicates from a list while keeping the original order.

    - `set()` loses order. `dict.fromkeys()` keeps insertion order (guaranteed since 3.7) and is O(n)
    - For unhashable items (like dicts), track a key you can hash

    ```python
    def dedupe(items):
        return list(dict.fromkeys(items))

    print(dedupe([3, 1, 3, 2, 1]))    # [3, 1, 2]

    def dedupe_by(items, key):
        seen = set()
        out = []
        for item in items:
            k = key(item)
            if k not in seen:
                seen.add(k)
                out.append(item)
        return out
    ```

## Intermediate

### Intermediate: Concepts

1. What is a decorator? Write one that logs how long a function takes.

    - A decorator is a callable that takes a function and returns a replacement, applied with `@decorator` syntax, which is shorthand for `func = decorator(func)`
    - Use `functools.wraps` so the wrapper keeps the original's name, docstring and signature for debugging and introspection
    - Common uses: logging, timing, retries, caching (`functools.cache`), access checks, registering handlers

    ```python
    import functools
    import time

    def timed(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = time.perf_counter()
            try:
                return func(*args, **kwargs)
            finally:
                print(f"{func.__name__} took {time.perf_counter() - start:.3f}s")
        return wrapper

    @timed
    def slow_add(a, b):
        time.sleep(0.2)
        return a + b

    slow_add(1, 2)    # slow_add took 0.200s
    ```

2. What are generators, and why use them instead of returning a list?

    - A function with `yield` returns a generator: an iterator that produces values lazily, pausing between them
    - Memory stays constant regardless of the number of items, and the consumer can stop early
    - Generator expressions (`(x * 2 for x in data)`) are the lazy version of list comprehensions
    - `yield from` delegates to a sub-generator. A generator can be consumed **only once**

    ```python
    def read_large_file(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                yield line.rstrip("\n")

    errors = sum(1 for line in read_large_file("app.log") if "ERROR" in line)
    ```

3. How do context managers work, and how do you write one?

    - `with` calls `__enter__` on entry and `__exit__` on exit, **even when an exception is raised**, which makes it the standard way to release resources (files, locks, connections, transactions)
    - `__exit__` receives the exception details and can suppress the exception by returning `True` (rarely a good idea)
    - `contextlib.contextmanager` turns a generator into a context manager

    ```python
    import time
    from contextlib import contextmanager

    @contextmanager
    def timer(label):
        start = time.perf_counter()
        try:
            yield
        finally:
            print(f"{label}: {time.perf_counter() - start:.3f}s")

    with timer("load"):
        data = [i ** 2 for i in range(1_000_000)]
    ```

4. Explain the LEGB rule, closures and `nonlocal`.

    - Names resolve in order: **L**ocal, **E**nclosing function scopes, **G**lobal (module), **B**uilt-ins
    - A **closure** is an inner function that remembers variables from its enclosing scope after the outer function returns
    - Assigning to a name makes it local to that scope. Use `nonlocal` to rebind an enclosing variable and `global` for a module-level one (sparingly)

    ```python
    def make_counter():
        count = 0
        def increment():
            nonlocal count
            count += 1
            return count
        return increment

    c = make_counter()
    c(); c()
    print(c())        # 3
    ```

5. What's the difference between `__str__` and `__repr__`, and when would you use a dataclass?

    - `__repr__` is for developers: unambiguous, ideally valid Python to recreate the object. Used in the REPL, logs and containers
    - `__str__` is for end users (`print`, f-strings). It falls back to `__repr__` if it isn't defined
    - `@dataclass` generates `__init__`, `__repr__` and `__eq__` (and optionally ordering, hashing, `frozen=True` immutability and `slots=True`) for classes that mainly hold data

    ```python
    from dataclasses import dataclass, field

    @dataclass(frozen=True, slots=True)
    class Server:
        name: str
        port: int = 443
        tags: tuple[str, ...] = field(default_factory=tuple)

    print(Server("web-1"))   # Server(name='web-1', port=443, tags=())
    ```

6. What's the difference between an iterable and an iterator?

    - An **iterable** has `__iter__` and returns a fresh iterator each time (lists, dicts, files, ranges)
    - An **iterator** has `__next__`, keeps position state, raises `StopIteration` when exhausted, and returns itself from `__iter__`
    - A `for` loop calls `iter()` once, then `next()` until `StopIteration`. That's why you can loop over a list twice but not over a generator

7. How do `try` / `except` / `else` / `finally` work, and what are exception chaining and exception groups?

    - `else` runs only if no exception was raised. Put code there that shouldn't be protected by the `except`
    - `finally` always runs, for clean-up
    - `raise NewError(...) from err` keeps the original exception as `__cause__` for clearer tracebacks; `from None` hides it
    - Python 3.11 added `ExceptionGroup` and `except*` for handling several exceptions raised together, typically from `asyncio.TaskGroup`
    - Catch specific exceptions. A bare `except:` also catches `KeyboardInterrupt` and `SystemExit`

### Intermediate: Scenarios

1. A script that parses a 20 GB log file gets killed by the OOM killer. How do you fix it?

    - It's almost certainly reading everything into memory: `f.read()`, `f.readlines()`, or building a giant list of parsed records
    - Stream it: iterate over the file object line by line, use generators for each pipeline stage, and aggregate as you go (counters, running totals)
    - For tabular data, read in chunks (`pandas.read_csv(chunksize=...)`) or use a streaming engine such as Polars' lazy API or DuckDB
    - Check memory with `tracemalloc` or `/usr/bin/time -v` before and after

2. You create a list of callbacks in a loop, and they all use the last loop value. Why?

    - Closures capture **variables, not values**, and look the value up when called (late binding). By then the loop has finished
    - Fix: bind the current value as a default argument, or use `functools.partial`

    ```python
    callbacks = [lambda: i for i in range(3)]
    print([f() for f in callbacks])            # [2, 2, 2]

    callbacks = [lambda i=i: i for i in range(3)]
    print([f() for f in callbacks])            # [0, 1, 2]
    ```

3. A job calls 500 REST endpoints one after another and takes 10 minutes. How would you speed it up?

    - The work is **I/O-bound**: the process spends almost all its time waiting on the network, so concurrency helps even with the GIL (blocking I/O releases it)
    - Simplest: `concurrent.futures.ThreadPoolExecutor` with a bounded number of workers around the existing `requests` code
    - Higher scale: `asyncio` with an async client (`httpx`, `aiohttp`) and a `Semaphore` to cap concurrency
    - Reuse connections (a `Session` or client), respect rate limits, add timeouts and retries with backoff
    - Don't use multiprocessing here. It adds overhead without helping I/O-bound work

    ```python
    from concurrent.futures import ThreadPoolExecutor
    import requests

    session = requests.Session()

    def fetch(url):
        return session.get(url, timeout=10).status_code

    with ThreadPoolExecutor(max_workers=20) as pool:
        statuses = list(pool.map(fetch, urls))
    ```

4. The app works on your laptop but fails in CI with a different version of a dependency. How do you make builds reproducible?

    - Always use a virtual environment per project (see [setting up virtual environments](/posts/programming/python/setup-virtual-environments-in-windows-and-linux/))
    - Declare direct dependencies in `pyproject.toml`, and **lock** the full resolved tree with hashes: `uv lock`, `pip-tools` (`pip-compile`), Poetry or PDM
    - Pin the Python version too (`requires-python`, `.python-version`, the CI image tag)
    - Install from the lock file in CI and in Docker images, and update dependencies deliberately (with Dependabot or Renovate), not by accident

5. A background worker occasionally "loses" jobs, with no errors in the logs. Code review finds `except Exception: pass`. What's wrong, and how do you fix it?

    - The handler swallows every error silently, so failures look like success. Bugs, timeouts and bad data all disappear
    - Catch the specific exceptions you can handle, log everything else with the traceback (`logger.exception(...)`), and let unexpected errors propagate or send the job to a dead-letter queue
    - Add metrics for failures and retries so silent drops become visible

### Intermediate: Coding

1. Implement an LRU cache with `get` and `put` in O(1).

    - `OrderedDict` keeps insertion order and supports `move_to_end` and `popitem(last=False)` in O(1)
    - In real code, `functools.lru_cache(maxsize=...)` covers memoising functions, but interviewers usually want the data structure

    ```python
    from collections import OrderedDict

    class LRUCache:
        def __init__(self, capacity):
            self.capacity = capacity
            self.data = OrderedDict()

        def get(self, key):
            if key not in self.data:
                return None
            self.data.move_to_end(key)
            return self.data[key]

        def put(self, key, value):
            if key in self.data:
                self.data.move_to_end(key)
            self.data[key] = value
            if len(self.data) > self.capacity:
                self.data.popitem(last=False)

    cache = LRUCache(2)
    cache.put("a", 1); cache.put("b", 2); cache.get("a"); cache.put("c", 3)
    print(list(cache.data))   # ['a', 'c']: 'b' was evicted
    ```

2. Flatten an arbitrarily nested list.

    - A recursive generator with `yield from` is clean and lazy
    - Watch out: strings are iterable too. Treat them as atoms. For extremely deep nesting, use an explicit stack to avoid the recursion limit

    ```python
    def flatten(items):
        for item in items:
            if isinstance(item, (list, tuple)):
                yield from flatten(item)
            else:
                yield item

    print(list(flatten([1, [2, [3, [4, "five"]]], (6,)])))
    # [1, 2, 3, 4, 'five', 6]
    ```

3. Write a `retry` decorator with exponential backoff that only retries specific exceptions.

    ```python
    import functools
    import time

    def retry(times=3, base_delay=0.5, exceptions=(Exception,)):
        def decorator(func):
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                for attempt in range(1, times + 1):
                    try:
                        return func(*args, **kwargs)
                    except exceptions:
                        if attempt == times:
                            raise
                        time.sleep(base_delay * 2 ** (attempt - 1))
            return wrapper
        return decorator

    @retry(times=4, exceptions=(ConnectionError, TimeoutError))
    def call_api():
        ...
    ```

    - Follow-ups: add jitter so many clients don't retry in sync, cap the maximum delay, and never retry non-idempotent operations blindly

4. Group a list of words into anagrams.

    ```python
    from collections import defaultdict

    def group_anagrams(words):
        groups = defaultdict(list)
        for w in words:
            groups["".join(sorted(w))].append(w)
        return list(groups.values())

    print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))
    # [['eat', 'tea', 'ate'], ['tan', 'nat'], ['bat']]
    ```

    - Complexity: O(n · k log k) for n words of length k. A 26-letter count tuple as the key makes it O(n · k)

## Advanced

### Advanced: Concepts

1. What is the GIL, what does it affect, and what's changing with free-threaded Python?

    - The **Global Interpreter Lock** in CPython lets only one thread execute Python bytecode at a time, which keeps reference counting and interpreter internals simple and fast
    - It limits **CPU-bound** threads (no parallel speed-up) but not **I/O-bound** ones, because blocking I/O and many C extensions (NumPy, hashing, compression) release it
    - Workarounds: `multiprocessing` / `ProcessPoolExecutor`, native extensions that release the GIL, or vectorised libraries
    - PEP 703 introduced an optional **free-threaded build** (`python3.13t`) in 3.13 as experimental. In 3.14 it became officially supported (PEP 779), but it's still a separate build, not the default, and extension modules must support it
    - The GIL never made your code thread-safe: compound operations like `counter += 1` can still interleave. Use locks

2. How does Python manage memory?

    - CPython uses **reference counting**: an object is freed as soon as its count reaches zero
    - A **cyclic garbage collector** (the `gc` module) finds reference cycles that counting can't free, using generational collection
    - Small objects come from the `pymalloc` allocator, so freed memory often isn't returned to the OS straight away. Process RSS can stay high after a spike
    - Tools: `sys.getsizeof`, `tracemalloc`, `gc.get_objects()`, `weakref` (references that don't keep objects alive, useful for caches and observers), and `__slots__` to remove the per-instance `__dict__` for millions of small objects

3. How does asyncio work under the hood?

    - An **event loop** runs on one thread and schedules **coroutines**. `await` is a suspension point where a coroutine yields control while waiting for I/O
    - `asyncio.create_task` wraps a coroutine in a **Task** so it runs concurrently. `asyncio.TaskGroup` (3.11+) gives structured concurrency: if one task fails, the others are cancelled and errors come back as an `ExceptionGroup`
    - It's cooperative: any blocking call (`time.sleep`, `requests.get`, heavy CPU work) freezes **every** task on the loop
    - Offload blocking work with `asyncio.to_thread()` or `loop.run_in_executor()`

4. When would you use a metaclass, a class decorator or `__init_subclass__`?

    - A **metaclass** controls class creation itself (`type` is the default). It's powerful, but hard to combine and hard to read. ORMs and frameworks use metaclasses
    - `__init_subclass__` (3.6+) runs whenever a class is subclassed. It covers most "register every subclass" or "validate subclasses" needs without a metaclass
    - A **class decorator** modifies a class after creation (`@dataclass` is one)
    - Rule of thumb: decorator first, then `__init_subclass__`, and a metaclass only when you truly need to change how the class object is built

    ```python
    class Plugin:
        registry = {}
        def __init_subclass__(cls, name, **kwargs):
            super().__init_subclass__(**kwargs)
            Plugin.registry[name] = cls

    class CsvExporter(Plugin, name="csv"):
        pass

    print(Plugin.registry)   # {'csv': <class '__main__.CsvExporter'>}
    ```

5. What are descriptors, and how do `property` and methods use them?

    - A descriptor is an object with `__get__`, `__set__` or `__delete__`, stored as a class attribute. It intercepts attribute access on instances
    - `property`, `staticmethod`, `classmethod` and plain functions (which become bound methods) are all descriptors
    - **Data descriptors** (with `__set__`) take precedence over the instance `__dict__`; non-data descriptors don't
    - There's a worked example in the advanced coding section below

6. What is the MRO, and how does `super()` work with multiple inheritance?

    - The **method resolution order** is the order Python searches classes for an attribute, computed with C3 linearisation. Inspect it with `Cls.__mro__`
    - `super()` means "the next class in the MRO of the instance's class", not "my parent". That's what makes cooperative multiple inheritance work, as long as every class calls `super()` and accepts `**kwargs`

    ```python
    class A:
        def hello(self): return "A"
    class B(A):
        def hello(self): return "B>" + super().hello()
    class C(A):
        def hello(self): return "C>" + super().hello()
    class D(B, C):
        pass

    print(D().hello())                          # B>C>A
    print([k.__name__ for k in D.__mro__])      # ['D', 'B', 'C', 'A', 'object']
    ```

7. How do type hints work at runtime, and when would you use a `Protocol`?

    - Hints aren't enforced at runtime. Static checkers (mypy, Pyright) and tools such as Pydantic use them
    - `typing.Protocol` defines **structural** types: any class with the right methods matches, no inheritance needed. That's duck typing a type checker can verify
    - Generics (`list[int]`, PEP 695 `def first[T](xs: list[T]) -> T` in 3.12+), `TypedDict` for dict shapes, and `Literal` / `Final` for constants
    - Python 3.14 evaluates annotations lazily by default (PEP 649/749), which removes most of the need for `from __future__ import annotations` and string forward references

### Advanced: Scenarios

1. A long-running API service's memory grows steadily until the container is OOM-killed. How do you find the leak?

    - Confirm it's growth, not just a high plateau. Graph RSS over time against request count
    - Usual suspects: unbounded caches or dicts keyed by request data, `lru_cache` on methods (it holds a reference to `self`), global lists that only grow, objects held by closures or callbacks, cycles involving objects with `__del__`, and C-extension leaks
    - Compare `tracemalloc` snapshots taken some minutes apart to see which lines allocate the growing memory. Use `objgraph` or `gc.get_referrers` to see what keeps objects alive
    - Short-term mitigation: worker recycling (Gunicorn `--max-requests` with jitter) while you fix the root cause

    ```python
    import tracemalloc
    tracemalloc.start(25)
    before = tracemalloc.take_snapshot()
    # ... let the service handle traffic ...
    after = tracemalloc.take_snapshot()
    for stat in after.compare_to(before, "lineno")[:10]:
        print(stat)
    ```

2. A CPU-heavy image-processing job uses 16 threads on a 16-core machine, but it's no faster than one thread. Why, and what would you do?

    - On standard CPython, the GIL lets only one thread run Python bytecode at a time, so CPU-bound threads take turns
    - Use `ProcessPoolExecutor` or `multiprocessing` to spread work across cores (watch pickling overhead and memory per process)
    - Push the heavy loops into libraries that release the GIL (Pillow, NumPy, OpenCV), or into native code (Cython, Rust via PyO3)
    - The free-threaded build (3.14t) can run threads in parallel if all your dependencies support it. Benchmark it, because single-thread overhead exists

3. An asyncio web service freezes for a few seconds every so often, and all requests stall together. What do you check?

    - Something is **blocking the event loop**: a synchronous HTTP or database client, `time.sleep`, file I/O, or a CPU-heavy function in a coroutine
    - Turn on asyncio debug mode (`PYTHONASYNCIODEBUG=1`, or `asyncio.run(main(), debug=True)`), which logs callbacks slower than 100 ms
    - Profile with `py-spy dump` during a stall to see what the loop thread is doing
    - Fix: switch to async clients, wrap unavoidable blocking calls in `asyncio.to_thread()`, move CPU work to a process pool, and add timeouts everywhere

4. A CLI tool takes three seconds to start, even for `--help`. How do you speed it up?

    - Measure first: `python -X importtime -c "import mytool" 2> import.log` shows the cumulative time each import takes
    - Move heavy imports (pandas, cloud SDKs, ML libraries) inside the functions that need them, so `--help` never loads them
    - Python 3.15 adds explicit **lazy imports** (PEP 810): `lazy import pandas` defers loading until the name is first used, and there's a global switch (`-X lazy_imports`) for experiments
    - Also check for expensive work at import time (network calls, config loading) and for slow entry-point discovery

5. A colleague wants to cache user session objects by pickling them into Redis. What concerns do you raise?

    - **Security**: unpickling untrusted data can execute arbitrary code. If anyone can write to that Redis key, it's a remote-code-execution path
    - **Compatibility**: pickles tie the data to class definitions and Python versions, so deployments that rename classes break old sessions
    - Prefer JSON (or MessagePack) with explicit schemas (Pydantic, dataclasses), and sign or encrypt data if it crosses trust boundaries

### Advanced: Coding

1. Implement a thread-safe token-bucket rate limiter.

    - Tokens refill continuously at `rate` per second up to `capacity`. Each request spends a token or is rejected
    - Use `time.monotonic()` (not `time.time()`, which can jump) and a lock around the read-modify-write

    ```python
    import threading
    import time

    class TokenBucket:
        def __init__(self, rate, capacity):
            self.rate = rate
            self.capacity = capacity
            self.tokens = capacity
            self.updated = time.monotonic()
            self.lock = threading.Lock()

        def allow(self, cost=1):
            with self.lock:
                now = time.monotonic()
                self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.rate)
                self.updated = now
                if self.tokens >= cost:
                    self.tokens -= cost
                    return True
                return False

    bucket = TokenBucket(rate=5, capacity=10)
    print(sum(bucket.allow() for _ in range(20)))   # about 10: the burst capacity
    ```

    - Follow-ups: an async version with `asyncio.Lock`, a distributed version with Redis and a Lua script, and returning the wait time instead of `False`

2. Fetch 50 URLs concurrently with asyncio, limited to 10 requests in flight, and collect the results in order.

    - `asyncio.Semaphore` caps concurrency. `TaskGroup` gives structured concurrency and cancels the rest if one task fails
    - The fake `fetch` keeps the example runnable; swap in `httpx.AsyncClient` for real calls

    ```python
    import asyncio
    import random

    async def fetch(url):
        await asyncio.sleep(random.uniform(0.1, 0.5))   # stand-in for network I/O
        return f"{url}: 200"

    async def fetch_all(urls, limit=10):
        sem = asyncio.Semaphore(limit)

        async def worker(url):
            async with sem:
                return await fetch(url)

        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(worker(u)) for u in urls]
        return [t.result() for t in tasks]

    results = asyncio.run(fetch_all([f"https://example.com/{i}" for i in range(50)]))
    print(len(results), results[0])
    ```

    - Discuss: per-request timeouts (`asyncio.timeout()`, 3.11+), retries, and `return_exceptions=True` with `gather` when partial failure is acceptable

3. Write a descriptor that validates attributes are positive numbers, and use it on a class.

    ```python
    class Positive:
        def __set_name__(self, owner, name):
            self.name = name
            self.private = "_" + name

        def __get__(self, obj, objtype=None):
            if obj is None:
                return self
            return getattr(obj, self.private)

        def __set__(self, obj, value):
            if not isinstance(value, (int, float)) or value <= 0:
                raise ValueError(f"{self.name} must be a positive number, got {value!r}")
            setattr(obj, self.private, value)

    class Order:
        quantity = Positive()
        price = Positive()

        def __init__(self, quantity, price):
            self.quantity = quantity
            self.price = price

    order = Order(3, 9.99)
    order.quantity = 0     # ValueError: quantity must be a positive number, got 0
    ```

    - `__set_name__` (3.6+) tells the descriptor its attribute name, so it doesn't have to be passed in twice
    - Follow-up: how does `property` compare? It's a descriptor too, but you'd write a getter and setter per attribute instead of reusing one class

## Tips for the interview

A few things I'd keep in mind on the candidate's side of the table:

- **Talk through trade-offs, not just answers.** "I'd use a thread pool here because it's I/O-bound, but for CPU work I'd switch to processes" shows understanding that a correct snippet alone doesn't.
- **Know the standard library.** `collections`, `itertools`, `functools`, `pathlib`, `dataclasses`, `contextlib` and `concurrent.futures` solve half of the coding questions in a few lines.
- **Write readable code first.** Clear names, small functions and a test case or two beat a clever one-liner.
- **Say what you'd do in production.** Timeouts, logging, tests, typing and dependency pinning come up in senior interviews even when the question is about something else.
- **Be honest about versions.** If you're not sure whether a feature arrived in 3.11 or 3.12, say so. Nobody expects you to remember every changelog.

## Conclusion

Most Python interviews come back to the same few ideas: how names and objects work (mutability, references,
scope), how iteration and laziness work (iterators, generators), how resources are managed (context managers,
memory), and how concurrency actually behaves (the GIL, threads vs processes vs asyncio). Get those solid, and
the trick questions stop being tricky. A good next step: take three questions from the level above yours, write
the code without looking at the answers, and run it. Getting the output wrong teaches more than reading the
answer.

## References

- [Python documentation: the Python data model](https://docs.python.org/3/reference/datamodel.html)
- [Descriptor HowTo Guide](https://docs.python.org/3/howto/descriptor.html)
- [asyncio documentation](https://docs.python.org/3/library/asyncio.html)
- [PEP 703: Making the Global Interpreter Lock optional](https://peps.python.org/pep-0703/)
- [PEP 779: Criteria for supported status for free-threaded Python](https://peps.python.org/pep-0779/)
- [PEP 810: Explicit lazy imports](https://peps.python.org/pep-0810/)
- [PEP 790: Python 3.15 release schedule](https://peps.python.org/pep-0790/)
- [tracemalloc documentation](https://docs.python.org/3/library/tracemalloc.html)
