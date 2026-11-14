
(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    }));
  }

  const track = document.getElementById('listing-track');
  const prev = document.getElementById('slide-prev');
  const next = document.getElementById('slide-next');
  let slideIndex = 0;
  const visibleCards = () => [...document.querySelectorAll('.listing-card:not(.is-hidden)')];
  function moveSlider(direction) {
    const cards = visibleCards();
    if (!track || !cards.length) return;
    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    const perView = window.innerWidth <= 700 ? 1 : 3;
    const maxIndex = Math.max(0, cards.length - perView);
    slideIndex = Math.max(0, Math.min(maxIndex, slideIndex + direction));
    track.style.transform = `translateX(-${slideIndex * (cardWidth + gap)}px)`;
    if (prev) prev.disabled = slideIndex === 0;
    if (next) next.disabled = slideIndex === maxIndex;
  }
  prev?.addEventListener('click', () => moveSlider(-1));
  next?.addEventListener('click', () => moveSlider(1));
  window.addEventListener('resize', () => { slideIndex = 0; if (track) track.style.transform = 'translateX(0)'; moveSlider(0); });

  document.querySelectorAll('.filter-chip').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      const category = button.dataset.filter;
      document.querySelectorAll('.listing-card').forEach(card => {
        card.classList.toggle('is-hidden', category !== 'All' && card.dataset.category !== category);
      });
      slideIndex = 0;
      if (track) track.style.transform = 'translateX(0)';
      moveSlider(0);
    });
  });

  document.querySelectorAll('.category-card').forEach(link => {
    link.addEventListener('click', () => {
      const category = link.dataset.category;
      const filter = [...document.querySelectorAll('.filter-chip')].find(button => button.dataset.filter === category);
      if (filter) filter.click();
      else document.querySelector('[data-filter="All"]')?.click();
    });
  });

  document.querySelectorAll('.save-button').forEach(button => {
    button.addEventListener('click', () => {
      const saved = button.classList.toggle('saved');
      button.textContent = saved ? '♥' : '♡';
      button.setAttribute('aria-label', saved ? 'Remove saved example' : 'Save example');
    });
  });

  document.getElementById('hero-search')?.addEventListener('submit', event => {
    event.preventDefault();
    const query = document.getElementById('search-input')?.value.trim().toLowerCase() || '';
    const match = [...document.querySelectorAll('.filter-chip')].find(button =>
      button.dataset.filter !== 'All' && query.includes(button.dataset.filter.toLowerCase())
    );
    (match || document.querySelector('[data-filter="All"]'))?.click();
    document.getElementById('marketplace')?.scrollIntoView({ behavior: 'smooth' });
  });


  // Site-wide English/Bangla language selector.
  const languageSelect = document.getElementById('language-select');
  const translations = {
    "Marketplace":"মার্কেটপ্লেস","Categories":"ক্যাটাগরি","How it works":"যেভাবে কাজ করে","Why Nexa":"কেন Nexa",
    "Log in":"লগ ইন","List your asset":"আপনার অ্যাসেট লিস্ট করুন",
    "A smarter way to move digital ownership":"ডিজিটাল অ্যাসেট কেনাবেচার আরও স্মার্ট উপায়",
    "See how it works":"যেভাবে কাজ করে দেখুন",
    "THE GLOBAL MARKETPLACE FOR DIGITAL ASSETS":"ডিজিটাল অ্যাসেটের গ্লোবাল মার্কেটপ্লেস",
    "Buy & Sell Digital":"ডিজিটাল অ্যাসেট কিনুন ও বিক্রি করুন",
    "Assets with Confidence.":"আত্মবিশ্বাসের সঙ্গে।",
    "Discover, buy and sell websites, online businesses, domains, SaaS products and social media assets through a transparent, secure marketplace.":"স্বচ্ছ ও নিরাপদ মার্কেটপ্লেসে ওয়েবসাইট, অনলাইন ব্যবসা, ডোমেইন, SaaS পণ্য এবং সোশ্যাল মিডিয়া অ্যাসেট খুঁজুন, কিনুন ও বিক্রি করুন।",
    "Search digital assets":"ডিজিটাল অ্যাসেট খুঁজুন","Try “YouTube”, “SaaS”, “website”, “domain”…":"যেমন “YouTube”, “SaaS”, “website”, “domain”…",
    "Explore assets":"অ্যাসেট দেখুন","Built around clarity and confidence":"স্বচ্ছতা ও আস্থাকে ভিত্তি করে তৈরি",
    "Transparent details. A considered buying journey.":"স্বচ্ছ তথ্য। পরিকল্পিত কেনাকাটার অভিজ্ঞতা।",
    "FEATURED OPPORTUNITY":"বিশেষ সুযোগ","Room to grow":"বিকাশের সুযোগ","Find your next opportunity":"আপনার পরবর্তী সুযোগ খুঁজুন",
    "ONLINE BUSINESS":"অনলাইন ব্যবসা","Built for what's next.":"আগামীর জন্য তৈরি।","A digital business example":"ডিজিটাল ব্যবসার নমুনা",
    "Modern commerce concept":"আধুনিক কমার্সের নমুনা","Review-ready":"পর্যালোচনার জন্য প্রস্তুত",
    "Business type":"ব্যবসার ধরন","E-commerce":"ই-কমার্স","Ownership":"মালিকানা","Digital asset":"ডিজিটাল অ্যাসেট",
    "Discovery":"অন্বেষণ","Explore details":"বিস্তারিত দেখুন","Trust, by design":"ডিজাইনেই আস্থা",
    "Clear steps at every stage":"প্রতিটি ধাপে স্পষ্ট নির্দেশনা","EXPLORE A WORLD OF DIGITAL OPPORTUNITY":"ডিজিটাল সম্ভাবনার জগৎ ঘুরে দেখুন",
    "Websites":"ওয়েবসাইট","SaaS":"SaaS","Domains":"ডোমেইন","Creator assets":"ক্রিয়েটর অ্যাসেট",
    "FIND YOUR NEXT MOVE":"আপনার পরবর্তী পদক্ষেপ খুঁজুন","Explore by":"ক্যাটাগরি অনুযায়ী",
    "category.":"অন্বেষণ করুন।","From established online businesses to the next big idea, find the kind of asset that fits your ambition.":"প্রতিষ্ঠিত অনলাইন ব্যবসা থেকে নতুন সম্ভাবনা—আপনার লক্ষ্য অনুযায়ী অ্যাসেট খুঁজে নিন।",
    "Content sites & blogs":"কনটেন্ট সাইট ও ব্লগ","SaaS & Software":"SaaS ও সফটওয়্যার","Tools, apps & platforms":"টুল, অ্যাপ ও প্ল্যাটফর্ম",
    "Online stores & brands":"অনলাইন স্টোর ও ব্র্যান্ড","Memorable web addresses":"সহজে মনে রাখার মতো ওয়েব ঠিকানা",
    "YouTube Channels":"YouTube চ্যানেল","Monetized & growing channels":"মনিটাইজড ও উন্নয়নশীল চ্যানেল",
    "Facebook Assets":"Facebook অ্যাসেট","Pages, groups & communities":"পেজ, গ্রুপ ও কমিউনিটি",
    "Instagram Accounts":"Instagram অ্যাকাউন্ট","Creator & business profiles":"ক্রিয়েটর ও ব্যবসায়িক প্রোফাইল",
    "TikTok Accounts":"TikTok অ্যাকাউন্ট","Creator accounts & audiences":"ক্রিয়েটর অ্যাকাউন্ট ও অডিয়েন্স",
    "More digital assets":"আরও ডিজিটাল অ্যাসেট","Discover new possibilities":"নতুন সম্ভাবনা আবিষ্কার করুন",
    "A WORLD OF OPPORTUNITY":"সম্ভাবনার এক বিশাল জগৎ","Discover what's":"আবিষ্কার করুন",
    "possible.":"কী কী সম্ভব।","Explore asset types and example opportunities":"অ্যাসেটের ধরন ও নমুনা সুযোগ দেখুন",
    "All assets":"সব অ্যাসেট","Concept preview":"নমুনা প্রিভিউ","WEBSITE":"ওয়েবসাইট",
    "● Example":"● নমুনা","Editorial & content website":"এডিটোরিয়াল ও কনটেন্ট ওয়েবসাইট",
    "A content-led web property concept with room to develop.":"উন্নয়নের সুযোগসহ একটি কনটেন্টভিত্তিক ওয়েবসাইটের নমুনা।",
    "Explore category":"ক্যাটাগরি দেখুন","View details ↗":"বিস্তারিত দেখুন ↗",
    "SAAS & SOFTWARE":"SaaS ও সফটওয়্যার","Analytics software concept":"অ্যানালিটিক্স সফটওয়্যারের নমুনা",
    "A software product concept for teams that value insight.":"তথ্যভিত্তিক সিদ্ধান্ত নিতে আগ্রহী টিমের জন্য সফটওয়্যার পণ্যের নমুনা।",
    "E-COMMERCE":"ই-কমার্স","Independent online store":"স্বতন্ত্র অনলাইন স্টোর",
    "A commerce concept ready for a fresh brand direction.":"নতুন ব্র্যান্ড পরিচয়ের উপযোগী কমার্স নমুনা।",
    "ONLINE BUSINESS":"অনলাইন ব্যবসা","Digital business showcase":"ডিজিটাল ব্যবসার প্রদর্শনী",
    "A sample profile showing how an asset can be presented.":"একটি অ্যাসেট কীভাবে উপস্থাপন করা যায় তার নমুনা প্রোফাইল।",
    "DIGITAL PRODUCT":"ডিজিটাল পণ্য","Productivity tool concept":"প্রোডাক্টিভিটি টুলের নমুনা",
    "A digital product idea with a clear path to evolve.":"উন্নয়নের সুস্পষ্ট সম্ভাবনাসহ একটি ডিজিটাল পণ্যের ধারণা।",
    "Illustrative previews only — these are design examples, not active listings or verified businesses.":"শুধু দৃষ্টান্তমূলক প্রিভিউ—এগুলো ডিজাইনের নমুনা, সক্রিয় লিস্টিং বা যাচাইকৃত ব্যবসা নয়।",
    "BUILT ON CONFIDENCE":"আস্থার ভিত্তিতে তৈরি","Big decisions need":"বড় সিদ্ধান্তের জন্য দরকার",
    "clear foundations.":"স্বচ্ছ ভিত্তি।","Buying or selling a digital business is a major move. The experience should make every step easier to understand.":"ডিজিটাল ব্যবসা কেনা বা বিক্রি করা বড় সিদ্ধান্ত। প্রতিটি ধাপ সহজে বোঝার মতো হওয়া উচিত।",
    "Explore our approach":"আমাদের পদ্ধতি জানুন","Seller verification":"সেলার যাচাইকরণ",
    "Identity checks designed to build accountability and trust.":"জবাবদিহি ও আস্থা তৈরির জন্য পরিচয় যাচাই।",
    "Secure transaction journey":"নিরাপদ লেনদেন প্রক্রিয়া",
    "A structured payment and handover process through suitable payment partners.":"উপযুক্ত পেমেন্ট পার্টনারের মাধ্যমে পরিকল্পিত পেমেন্ট ও হস্তান্তর প্রক্রিয়া।",
    "Transparent costs":"স্বচ্ছ খরচ","Understand the applicable fees and terms before you commit.":"সিদ্ধান্ত নেওয়ার আগে প্রযোজ্য ফি ও শর্ত বুঝে নিন।",
    "Support when it matters":"প্রয়োজনের সময় সহায়তা","Clear guidance and a defined path when a transaction needs attention.":"লেনদেনে সহায়তা প্রয়োজন হলে স্পষ্ট নির্দেশনা ও নির্ধারিত প্রক্রিয়া।",
    "SIMPLE BY DESIGN":"সহজ ব্যবহারের জন্য ডিজাইন","From discovery to":"অন্বেষণ থেকে",
    "new ownership.":"নতুন মালিকানা।","A straightforward journey that keeps buyers and sellers informed at every important stage.":"সহজ একটি প্রক্রিয়া, যা প্রতিটি গুরুত্বপূর্ণ ধাপে ক্রেতা ও বিক্রেতাকে অবগত রাখে।",
    "Discover":"খুঁজে দেখুন","Explore digital assets, review available information and find the right fit.":"ডিজিটাল অ্যাসেট দেখুন, তথ্য পর্যালোচনা করুন এবং উপযুক্তটি বেছে নিন।",
    "Connect":"যোগাযোগ করুন","Discuss the details directly with the seller and agree on the terms.":"বিক্রেতার সঙ্গে সরাসরি আলোচনা করে শর্তে সম্মত হন।",
    "Pay securely":"নিরাপদে পেমেন্ট করুন","Complete payment through the platform's supported secure transaction flow.":"প্ল্যাটফর্মের সমর্থিত নিরাপদ লেনদেন ব্যবস্থায় পেমেন্ট সম্পন্ন করুন।",
    "Transfer & confirm":"হস্তান্তর ও নিশ্চিত করুন","Receive the agreed asset, confirm completion and finalize the transaction.":"সম্মত অ্যাসেট গ্রহণ করুন, সম্পন্ন হওয়া নিশ্চিত করুন এবং লেনদেন শেষ করুন।",
    "NO SURPRISES":"কোনো অপ্রত্যাশিত খরচ নয়","Know the costs.":"খরচ জেনে নিন।","Before you buy.":"কেনার আগেই।",
    "Our pricing approach is designed around transparency. Any applicable transaction costs will be shown clearly before checkout.":"আমাদের মূল্য নির্ধারণ পদ্ধতি স্বচ্ছতার ভিত্তিতে তৈরি। প্রযোজ্য লেনদেন খরচ চেকআউটের আগে স্পষ্টভাবে দেখানো হবে।",
    "Free asset listing":"বিনামূল্যে অ্যাসেট লিস্টিং","No monthly seller maintenance fee":"সেলারদের জন্য মাসিক রক্ষণাবেক্ষণ ফি নেই",
    "No fee on unsuccessful sales":"বিক্রি সম্পন্ন না হলে কোনো ফি নেই","Learn about our approach":"আমাদের পদ্ধতি সম্পর্কে জানুন",
    "PROPOSED TOTAL FEE CAP":"প্রস্তাবিত সর্বোচ্চ মোট ফি","PLANNING MODEL":"পরিকল্পনাধীন কাঠামো",
    "Maximum combined mandatory transaction-cost target":"সব বাধ্যতামূলক লেনদেন খরচ মিলিয়ে সর্বোচ্চ লক্ষ্যমাত্রা",
    "Platform service":"প্ল্যাটফর্ম সেবা","Secure transaction":"নিরাপদ লেনদেন",
    "Verification & support":"যাচাইকরণ ও সহায়তা","Total planned cap":"পরিকল্পিত সর্বোচ্চ মোট",
    "Proposed fee structure, subject to payment-provider, operational and legal review. Final applicable charges and who pays them will be disclosed before checkout.":"প্রস্তাবিত ফি কাঠামো—পেমেন্ট প্রদানকারী, পরিচালনাগত ও আইনি পর্যালোচনা সাপেক্ষে। চেকআউটের আগে চূড়ান্ত ফি এবং কে পরিশোধ করবেন তা জানানো হবে।",
    "GOOD TO KNOW":"জেনে রাখা ভালো","Questions,":"আপনার প্রশ্নের",
    "answered.":"উত্তর।","A little more clarity before you take your next step.":"পরবর্তী পদক্ষেপের আগে আরও কিছু তথ্য জেনে নিন।",
    "What kind of digital assets can I explore?":"আমি কী ধরনের ডিজিটাল অ্যাসেট দেখতে পারি?",
    "We are building for websites, content businesses, SaaS products, e-commerce stores, domains, creator assets and other digital properties.":"আমরা ওয়েবসাইট, কনটেন্ট ব্যবসা, SaaS পণ্য, ই-কমার্স স্টোর, ডোমেইন, ক্রিয়েটর অ্যাসেট এবং অন্যান্য ডিজিটাল সম্পদের জন্য প্ল্যাটফর্ম তৈরি করছি।",
    "Do I have to pay to list an asset?":"অ্যাসেট লিস্ট করতে কি ফি দিতে হবে?",
    "Our planned model includes free listings, with no monthly seller maintenance fee.":"আমাদের পরিকল্পিত মডেলে লিস্টিং বিনামূল্যে এবং সেলারদের কোনো মাসিক রক্ষণাবেক্ষণ ফি নেই।",
    "How does the transaction process work?":"লেনদেন প্রক্রিয়া কীভাবে কাজ করে?",
    "Buyers and sellers discuss and agree on the asset terms. Payment is then handled through the supported transaction process, followed by asset transfer and buyer confirmation.":"ক্রেতা ও বিক্রেতা অ্যাসেটের শর্ত নিয়ে আলোচনা করে সম্মত হন। এরপর সমর্থিত লেনদেন ব্যবস্থায় পেমেন্ট হয়, তারপর অ্যাসেট হস্তান্তর ও ক্রেতার নিশ্চিতকরণ সম্পন্ন হয়।",
    "Are the assets shown here real listings?":"এখানে দেখানো অ্যাসেটগুলো কি আসল লিস্টিং?",
    "No. The cards on this preview homepage are illustrative design examples. Actual listings will be identified clearly when the marketplace is operational.":"না। এই প্রিভিউ হোমপেজের কার্ডগুলো শুধু ডিজাইনের নমুনা। মার্কেটপ্লেস চালু হলে প্রকৃত লিস্টিংগুলো স্পষ্টভাবে চিহ্নিত থাকবে।",
    "YOUR NEXT CHAPTER STARTS HERE":"আপনার নতুন অধ্যায় শুরু হোক এখানে",
    "Ready to make a":"প্রস্তুত কি আপনার",
    "move online?":"অনলাইন যাত্রা শুরু করতে?","Whether you're looking for your next opportunity or preparing to sell, start with a clearer view.":"আপনি নতুন সুযোগ খুঁজুন বা বিক্রির প্রস্তুতি নিন—শুরু করুন আরও স্বচ্ছ ধারণা নিয়ে।",
    "Explore the marketplace":"মার্কেটপ্লেস ঘুরে দেখুন","Thinking of selling?":"বিক্রির কথা ভাবছেন?",
    "FLEXIBLE WAYS TO PAY":"পেমেন্টের সহজ ও নমনীয় উপায়",
    "Global reach.":"বিশ্বজুড়ে সুবিধা।","Local convenience.":"স্থানীয় স্বাচ্ছন্দ্য।",
    "We’re designing a checkout experience that can support trusted card networks, digital wallets, local mobile payments and bank transfers — with options shown according to your country and currency.":"আমরা এমন চেকআউট ব্যবস্থা তৈরি করছি, যেখানে নির্ভরযোগ্য কার্ড নেটওয়ার্ক, ডিজিটাল ওয়ালেট, স্থানীয় মোবাইল পেমেন্ট ও ব্যাংক ট্রান্সফার সমর্থনের পরিকল্পনা রয়েছে—আপনার দেশ ও মুদ্রা অনুযায়ী অপশন দেখানো হবে।",
    "Cards":"কার্ড","International debit and credit card networks":"আন্তর্জাতিক ডেবিট ও ক্রেডিট কার্ড নেটওয়ার্ক",
    "Digital wallets":"ডিজিটাল ওয়ালেট","Fast and convenient online checkout options":"দ্রুত ও সুবিধাজনক অনলাইন পেমেন্ট",
    "Bangladesh mobile payments":"বাংলাদেশের মোবাইল পেমেন্ট","Local payment options under consideration":"বিবেচনাধীন স্থানীয় পেমেন্ট পদ্ধতি",
    "Bank transfers":"ব্যাংক ট্রান্সফার","Where supported by our payment partners":"আমাদের পেমেন্ট পার্টনার সমর্থন করলে",
    "Payment availability matters.":"পেমেন্টের প্রাপ্যতা গুরুত্বপূর্ণ।",
    "These are planned payment methods, not active integrations yet. The actual options will depend on country, currency, provider approval and transaction eligibility. We’ll display only methods that are enabled at checkout.":"এগুলো পরিকল্পিত পেমেন্ট পদ্ধতি, এখনো সক্রিয় ইন্টিগ্রেশন নয়। প্রকৃত অপশন দেশ, মুদ্রা, প্রদানকারীর অনুমোদন ও লেনদেনের যোগ্যতার ওপর নির্ভর করবে। চেকআউটে শুধু চালু থাকা পদ্ধতিই দেখানো হবে।",
    "A more considered marketplace for digital ownership.":"ডিজিটাল মালিকানা কেনাবেচার জন্য আরও সুপরিকল্পিত মার্কেটপ্লেস।",
    "Explore":"অন্বেষণ","Company":"কোম্পানি","Information":"তথ্য",
    "About the platform":"প্ল্যাটফর্ম সম্পর্কে","Contact":"যোগাযোগ","Trust & safety":"আস্থা ও নিরাপত্তা",
    "FAQ":"সাধারণ জিজ্ঞাসা","Terms of service":"সেবার শর্তাবলি","Privacy policy":"গোপনীয়তা নীতি",
    "All rights reserved.":"সর্বস্বত্ব সংরক্ষিত।","Designed for confident digital ownership.":"আত্মবিশ্বাসের সঙ্গে ডিজিটাল মালিকানা হস্তান্তরের জন্য তৈরি।"
  };
  const originalTextNodes = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const raw = node.nodeValue;
    const trimmed = raw.trim();
    if (trimmed && translations[trimmed]) originalTextNodes.push({node,raw,trimmed});
  }
  const originalAttributes = [];
  document.querySelectorAll('input[placeholder], [aria-label]').forEach(el => {
    for (const attr of ['placeholder','aria-label']) {
      const value = el.getAttribute(attr);
      if (value && translations[value]) originalAttributes.push({el,attr,value});
    }
  });
  function setLanguage(language) {
    const isBangla = language === 'bn';
    originalTextNodes.forEach(({node,raw,trimmed}) => {
      const leading = raw.match(/^\s*/)?.[0] || '';
      const trailing = raw.match(/\s*$/)?.[0] || '';
      node.nodeValue = leading + (isBangla ? translations[trimmed] : trimmed) + trailing;
    });
    originalAttributes.forEach(({el,attr,value}) => el.setAttribute(attr, isBangla ? translations[value] : value));
    document.documentElement.lang = isBangla ? 'bn' : 'en';
    if (languageSelect) languageSelect.value = language;
    document.title = isBangla ? 'Nexa — ডিজিটাল ব্যবসা কেনাবেচা' : 'Nexa — Buy & Sell Digital Businesses';
    try { localStorage.setItem('nexa-language', language); } catch (_) {}
  }
  if (languageSelect) {
    let initialLanguage = 'en';
    try {
      const saved = localStorage.getItem('nexa-language');
      const locale = (navigator.language || '').toLowerCase();
      const regionIsBangladesh = /-bd$/.test(locale) || locale === 'bn' || locale.startsWith('bn-');
      const dhakaTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Dhaka';
      initialLanguage = saved === 'bn' || saved === 'en' ? saved : (regionIsBangladesh || dhakaTimezone ? 'bn' : 'en');
    } catch (_) {}
    setLanguage(initialLanguage);
    languageSelect.addEventListener('change', () => setLanguage(languageSelect.value));
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  moveSlider(0);
})();
