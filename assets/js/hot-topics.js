// Hot topics explorer on the home page (_includes/hot-topics.html): turns the topic links into
// tabs that show one panel at a time. A highlight slides to the selected tab and the panel's rows
// animate in on each switch and when the section first scrolls into view (CSS in
// _sass/hot-topics.scss; both are switched off under prefers-reduced-motion). Remembers the last
// tab per browser; arrow keys move between tabs.
(function () {
  const section = document.getElementById('hot-topics');
  if (!section) return;

  const list = section.querySelector('.ht-tabs');
  const tabs = [...section.querySelectorAll('.ht-tab')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  if (!tabs.length || panels.includes(null)) return;

  const KEY = 'cloudutsuk-hot-topic';
  const indicator = document.createElement('span');
  indicator.className = 'ht-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  list.prepend(indicator);
  let current = 0;

  function moveIndicator() {
    const t = tabs[current];
    indicator.style.width = `${t.offsetWidth}px`;
    indicator.style.height = `${t.offsetHeight}px`;
    indicator.style.transform = `translate(${t.offsetLeft}px, ${t.offsetTop}px)`;
  }

  // Restart the row animation: drop the class, force a reflow, add it back.
  function animate(panel) {
    panel.classList.remove('ht-enter', 'ht-waiting');
    void panel.offsetWidth;
    panel.classList.add('ht-enter');
  }

  function show(i) {
    current = i;
    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', i === j);
      t.tabIndex = i === j ? 0 : -1;
      panels[j].hidden = i !== j;
    });
    moveIndicator();
  }

  function select(i, focus) {
    if (i === current) return;
    show(i);
    animate(panels[i]);
    if (focus) tabs[i].focus();
    tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    try {
      localStorage.setItem(KEY, tabs[i].id);
    } catch (e) {
      // Storage blocked: the tab just isn't remembered.
    }
  }

  let start = 0;
  try {
    start = Math.max(0, tabs.findIndex((t) => t.id === localStorage.getItem(KEY)));
  } catch (e) {
    // Storage blocked: start on the first tab.
  }

  section.classList.add('ht-js');
  show(start);
  // Place the highlight without sliding in from the corner, then enable its transition.
  requestAnimationFrame(() => section.classList.add('ht-ready'));

  // First reveal: animate the rows once the section is on screen.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      animate(panels[current]);
      io.disconnect();
    }, { threshold: 0.2 });
    panels[current].classList.add('ht-waiting');
    io.observe(section);
  }

  tabs.forEach((t, i) => {
    t.addEventListener('click', (e) => {
      e.preventDefault();
      select(i, false);
    });
    t.addEventListener('keydown', (e) => {
      const move = { ArrowRight: 1, ArrowLeft: -1, Home: -i, End: tabs.length - 1 - i }[e.key];
      if (move === undefined) return;
      e.preventDefault();
      select((i + move + tabs.length) % tabs.length, true);
    });
  });

  // Tabs reflow when the window or the web font changes size.
  window.addEventListener('resize', moveIndicator);
  if (document.fonts) document.fonts.ready.then(moveIndicator);
})();
