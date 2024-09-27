---
layout: base
permalink: /specialist-manual/
---

<h1>Specialist Manual</h1>

{% assign sortedSupplements = supplements | sort: "title" %}
{% for supplement in sortedSupplements %}

  <section>
    <h2>{{ supplement.title }}</h2>
    {{ supplement.body | markdown }}
  </section>
{% endfor %}

<pre>
  {{ supplements | prettyJson }}
</pre>
