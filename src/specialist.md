---
layout: base
permalink: /specialist-manual/
---

# Specialist Manual

{% for supplement in supplements %}

  <section>
    <h2>{{ supplement.title }}</h2>
    {{ supplement.body }}
  </section>
{% endfor %}

<pre>
  {{ supplements | prettyJson }}
</pre>
