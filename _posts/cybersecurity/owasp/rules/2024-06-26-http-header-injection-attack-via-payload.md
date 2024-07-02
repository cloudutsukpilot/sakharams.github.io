---
layout: post
title: OWASP - HTTP Header Injection Attack via payload (CR/LF detected)
categories: [cybersecurity, owasp]
tags: [CyberSecurity, OWASP]
---

## Introduction
- HTTP Header Injection is a security vulnerability that arises when an attacker can manipulate the headers of an HTTP response. 
- This manipulation can lead to a variety of malicious outcomes, such as HTTP response splitting, cross-site scripting (XSS), and cache poisoning. 
- The vulnerability typically occurs when an application fails to sanitize input that is incorporated into HTTP headers, allowing the injection of control characters such as carriage return (\r) and line feed (\n).

### How HTTP Header Injection Works
- When a web application constructs HTTP headers using user input, an attacker can inject payloads that include CR (\r) and LF (\n) characters. 
- These characters can split the header section and create a separate response body or inject additional headers, leading to various types of attacks.

### Example Scenario
1. **Input Field Vulnerability**:
- Suppose an application includes user input in a response header, like in a `Set-Cookie` or `Location` header.

2. **Malicious Payload**:
- An attacker might inject a payload like:

```makefile
MaliciousUser\r\nX-Injection: injected-header\r\n
```
If the application does not properly sanitize this input, the resulting HTTP response might look like this:

```makefile
HTTP/1.1 200 OK
Content-Type: text/html
Set-Cookie: user=MaliciousUser\r\nX-Injection: injected-header\r\n

(rest of the response)
```

3. **Impact**:
- `HTTP Response Splitting`: If an attacker controls the content following the CR/LF characters, they could potentially inject additional headers or modify the response.
- `XSS`: By injecting script content, an attacker might be able to execute arbitrary JavaScript in the context of the user's browser.
- `Cache Poisoning`: By modifying cache-related headers, an attacker might poison the cache and serve malicious content to other users.

### Prevention Strategies

1. **Sanitize Input**:
- Ensure all user input that may be included in HTTP headers is properly sanitized.
- Remove or encode CR (\r) and LF (\n) characters from input.

2. **Use Secure Libraries**:
- Use libraries and frameworks that handle HTTP headers securely and automatically escape or sanitize input.

3. **Validate Input**:
- Implement strict validation for any input that will be included in headers. 
- For example, allow only alphanumeric characters and safe symbols.

### Code Example
- Here’s an example in Python, using the Flask web framework, showing how to prevent HTTP header injection:

```python
from flask import Flask, request, make_response

app = Flask(__name__)

def sanitize_input(value):
    # Replace CR and LF characters to prevent header injection
    return value.replace('\r', '').replace('\n', '')

@app.route('/')
def index():
    user = request.args.get('user', 'Guest')
    sanitized_user = sanitize_input(user)
    
    response = make_response(f"Hello, {sanitized_user}!")
    response.headers['X-User'] = sanitized_user
    return response

if __name__ == '__main__':
    app.run(debug=True)
```

### Detecting HTTP Header Injection
1. **Automated Tools**:
- Use security scanners like OWASP ZAP or Burp Suite to detect header injection vulnerabilities.

2. **Manual Testing**:
- Include CR/LF characters in input fields that are reflected in headers and observe the HTTP response to check for injection.

### Conclusion
- HTTP Header Injection is a serious vulnerability that can lead to various attack vectors, including response splitting, XSS, and cache poisoning. 
- By implementing proper input sanitization, validation, and using secure coding practices, developers can prevent this vulnerability and protect their applications.