---
layout: base
permalink: /specialist-manual/
---

# 2017 Specialist Manual

test

<ol>
  {% for issue in issues %}
    <li>
      <h2>{{ issue.title }}</h2>
      {{ issue.body }}
    </li>
  {% endfor %}
</ol>

<pre>
  {{ issues | prettyJson }}
</pre>
