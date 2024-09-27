---
layout: base
permalink: /specialist-manual/
---

# Specialist Manual

<ol>
  {% for supplement in supplements %}
    <li>
      <h2>{{ supplement.title }}</h2>
      {{ supplement.body }}
    </li>
  {% endfor %}
</ol>

<pre>
  {{ supplements | prettyJson }}
</pre>
