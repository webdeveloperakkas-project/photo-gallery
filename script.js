
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



  // Five-step Nexa transaction journey slider.
  const journeySlider = document.getElementById('journey-slider');
  if (journeySlider) {
    const journeySlides = [...journeySlider.querySelectorAll('[data-journey-slide]')];
    const journeyDots = [...journeySlider.querySelectorAll('[data-journey-to]')];
    const journeyPrev = document.getElementById('journey-prev');
    const journeyNext = document.getElementById('journey-next');
    const journeyCount = document.getElementById('journey-count');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let journeyIndex = 0;
    let journeyTimer;
    function showJourneySlide(index) {
      journeyIndex = (index + journeySlides.length) % journeySlides.length;
      journeySlides.forEach((slide, i) => {
        const active = i === journeyIndex;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      journeyDots.forEach((dot, i) => {
        const active = i === journeyIndex;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-selected', String(active));
      });
      if (journeyCount) journeyCount.textContent = String(journeyIndex + 1).padStart(2, '0') + ' / ' + String(journeySlides.length).padStart(2, '0');
      if (journeyPrev) journeyPrev.disabled = journeyIndex === 0;
      if (journeyNext) journeyNext.disabled = journeyIndex === journeySlides.length - 1;
    }
    function stopJourneyTimer() { if (journeyTimer) window.clearInterval(journeyTimer); }
    function startJourneyTimer() {
      stopJourneyTimer();
      if (!reducedMotion) journeyTimer = window.setInterval(() => showJourneySlide((journeyIndex + 1) % journeySlides.length), 6000);
    }
    journeyPrev?.addEventListener('click', () => { showJourneySlide(journeyIndex - 1); startJourneyTimer(); });
    journeyNext?.addEventListener('click', () => { showJourneySlide(journeyIndex + 1); startJourneyTimer(); });
    journeyDots.forEach(dot => dot.addEventListener('click', () => { showJourneySlide(Number(dot.dataset.journeyTo)); startJourneyTimer(); }));
    journeySlider.addEventListener('mouseenter', stopJourneyTimer);
    journeySlider.addEventListener('mouseleave', startJourneyTimer);
    journeySlider.addEventListener('focusin', stopJourneyTimer);
    journeySlider.addEventListener('focusout', startJourneyTimer);
    showJourneySlide(0);
    startJourneyTimer();
  }


  // Nexa authentication powered by Supabase Auth.
  const SUPABASE_URL = "https://hguwdcmwqcpswyxtskcb.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_NLm2aSYg_j-zzRNSU-86gQ_Oj-xyHr2";
  const supabaseClient = window.supabase?.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

  const authPage = document.getElementById('auth-page');
  const signupForm = document.getElementById('signup-form');
  const loginForm = document.getElementById('login-form');
  const authTabs = [...document.querySelectorAll('[data-auth-tab]')];
  const navLogin = document.getElementById('nav-login-link');
  const navSignup = document.getElementById('nav-signup-link');
  const navLogout = document.getElementById('nav-logout-button');
  const navDashboard = document.getElementById('nav-dashboard-link');
  const navProfile = document.getElementById('nav-profile-link');
  const authViews = {
    signup: signupForm,
    login: loginForm,
    'signup-otp': document.getElementById('signup-otp-form'),
    'signup-success': document.getElementById('signup-success'),
    forgot: document.getElementById('forgot-email-form'),
    'forgot-otp': document.getElementById('forgot-otp-form'),
    reset: document.getElementById('reset-password-form'),
    'reset-success': document.getElementById('reset-success')
  };
  let signupEmail = '';
  let recoveryEmail = '';
  let signupDetails = null;

  function setAuthFeedback(id, message, isError = true) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = message || '';
    element.style.color = isError ? '#b4533c' : '#087f65';
  }
  function setFormBusy(form, busy, busyText) {
    const button = form?.querySelector('button[type="submit"]');
    if (!button) return;
    if (busy) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = busyText || 'Please wait…';
    } else {
      button.disabled = false;
      if (button.dataset.originalText) button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
  function friendlyAuthError(error) {
    const message = String(error?.message || 'Something went wrong. Please try again.');
    if (/invalid login credentials/i.test(message)) return 'Incorrect email or password. Please check your details.';
    if (/email not confirmed/i.test(message)) return 'Please verify your email address before logging in.';
    if (/already registered|user already registered/i.test(message)) return 'An account with this email may already exist. Try logging in or use password recovery.';
    if (/password should be at least/i.test(message)) return 'Your password does not meet the required security rules.';
    if (/rate limit|too many requests/i.test(message)) return 'Too many attempts. Please wait a little and try again.';
    return message;
  }
  function updateAuthNavigation(session) {
    const signedIn = Boolean(session?.user);
    if (navLogin) navLogin.hidden = signedIn;
    if (navSignup) navSignup.hidden = signedIn;
    if (navLogout) navLogout.hidden = !signedIn;
    if (navDashboard) navDashboard.hidden = !signedIn;
    if (navProfile) navProfile.hidden = !signedIn;
  }
  if (!supabaseClient) {
    console.error('Supabase JS failed to load. Check the CDN connection.');
    setAuthFeedback('signup-feedback', 'Authentication could not load. Please refresh the page and try again.');
  } else {
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Unable to read Nexa session:', error.message);
      updateAuthNavigation(data?.session);
    });
    supabaseClient.auth.onAuthStateChange((event, session) => {
      updateAuthNavigation(session);
      if (event === 'PASSWORD_RECOVERY') navigateAuth('reset');
      if (event === 'SIGNED_IN' && session?.user && new URLSearchParams(location.hash.slice(1)).get('type') === 'signup') {
        const heading = document.querySelector('#signup-success h2');
        const copy = document.querySelector('#signup-success p');
        if (heading) heading.textContent = 'Email confirmed successfully!';
        if (copy) copy.textContent = 'Your email address is verified and your Nexa account is ready. The dashboard will be connected in the next step.';
        navigateAuth('signup-success');
      }
    });
    supabaseClient.auth.getSession().then(({ data }) => {
      const hashParams = new URLSearchParams(location.hash.slice(1));
      if (data?.session && hashParams.get('type') === 'signup') {
        const heading = document.querySelector('#signup-success h2');
        const copy = document.querySelector('#signup-success p');
        if (heading) heading.textContent = 'Email confirmed successfully!';
        if (copy) copy.textContent = 'Your email address is verified and your Nexa account is ready. The dashboard will be connected in the next step.';
        navigateAuth('signup-success');
      }
    });
  }

  function showAuthView(view) {
    Object.entries(authViews).forEach(([key, element]) => { if (element) element.hidden = key !== view; });
    const tabMode = view === 'login' ? 'login' : 'signup';
    authTabs.forEach(tab => {
      const active = tab.dataset.authTab === tabMode && view === tabMode;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    const asideTitle = document.getElementById('auth-aside-title');
    const asideCopy = document.getElementById('auth-aside-copy');
    if (asideTitle) asideTitle.textContent = view === 'login' ? 'Welcome back to Nexa.' : view.startsWith('forgot') || view === 'reset' || view === 'reset-success' ? 'Let’s get you back into your account.' : 'Your next digital opportunity starts here.';
    if (asideCopy) asideCopy.textContent = view === 'login' ? 'Log in to continue your digital asset journey.' : view.startsWith('forgot') || view === 'reset' || view === 'reset-success' ? 'Verify your email and securely choose a new password.' : 'A clearer way to discover, buy and sell digital assets.';
    window.scrollTo(0,0);
  }
  function showAuth(mode) {
    if (!authPage) return;
    authPage.hidden = false;
    document.body.classList.add('auth-open');
    showAuthView(mode);
  }
  function closeAuth() {
    if (!authPage) return;
    authPage.hidden = true;
    document.body.classList.remove('auth-open');
    if (location.hash.startsWith('#auth-')) history.replaceState(null,'',location.pathname + location.search);
  }
  function navigateAuth(view) {
    if (location.hash !== '#auth-' + view) history.pushState(null,'','#auth-' + view);
    showAuth(view);
  }
  document.querySelectorAll('[data-auth-open]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); navigateAuth(link.dataset.authOpen);
  }));
  document.querySelectorAll('[data-auth-tab]').forEach(tab => tab.addEventListener('click', () => navigateAuth(tab.dataset.authTab)));
  document.querySelectorAll('[data-auth-step]').forEach(button => button.addEventListener('click', () => navigateAuth(button.dataset.authStep)));
  document.querySelectorAll('[data-auth-close]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); closeAuth(); }));
  window.addEventListener('hashchange', () => {
    const view = location.hash.replace('#auth-','');
    if (authViews[view]) showAuth(view);
    else if (authPage && !authPage.hidden) closeAuth();
  });
  const initialAuthView = location.hash.replace('#auth-','');
  if (authViews[initialAuthView]) showAuth(initialAuthView);

  document.querySelectorAll('[data-password-toggle]').forEach(button => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.textContent = reveal ? 'Hide' : 'Show';
    button.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
  }));

  signupForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const password = document.getElementById('signup-password');
    const confirm = document.getElementById('signup-confirm-password');
    if (password.value !== confirm.value) { setAuthFeedback('signup-feedback','Your passwords do not match. Please check and try again.'); confirm.focus(); return; }
    if (!signupForm.reportValidity()) return;
    if (!supabaseClient) { setAuthFeedback('signup-feedback','Authentication service is unavailable. Please refresh and try again.'); return; }
    const formData = Object.fromEntries(new FormData(signupForm).entries());
    signupEmail = String(formData.email || '').trim().toLowerCase();
    signupDetails = {
      first_name: String(formData.firstName || '').trim(),
      last_name: String(formData.lastName || '').trim(),
      display_name: [formData.firstName,formData.lastName].filter(Boolean).join(' ').trim(),
      country: String(formData.country || ''),
      updates_opt_in: formData.updates === 'on'
    };
    setAuthFeedback('signup-feedback','',false);
    setFormBusy(signupForm,true,'Creating account…');
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: signupEmail,
        password: password.value,
        options: { data: signupDetails }
      });
      if (error) throw error;
      const successHeading = document.querySelector('#signup-success h2');
      const successCopy = document.querySelector('#signup-success p');
      if (successHeading) successHeading.textContent = data.session ? 'Account created successfully!' : 'Check your email to confirm your account.';
      if (successCopy) successCopy.textContent = data.session
        ? 'Your Nexa account is ready. The dashboard will be connected in the next step.'
        : 'We sent you a confirmation link. Open the email and click Confirm to verify your address. You will return to Nexa automatically.';
      navigateAuth('signup-success');
      password.value = '';
      confirm.value = '';
    } catch (error) {
      setAuthFeedback('signup-feedback',friendlyAuthError(error));
    } finally { setFormBusy(signupForm,false); }
  });

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    if (!supabaseClient) { setAuthFeedback('login-feedback','Authentication service is unavailable.'); return; }
    const values = Object.fromEntries(new FormData(loginForm).entries());
    setFormBusy(loginForm,true,'Signing in…');
    setAuthFeedback('login-feedback','',false);
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: String(values.email || '').trim().toLowerCase(),
        password: values.password
      });
      if (error) throw error;
      updateAuthNavigation(data.session);
      closeAuth();
      loginForm.reset();
    } catch (error) {
      setAuthFeedback('login-feedback',friendlyAuthError(error));
    } finally { setFormBusy(loginForm,false); }
  });

  document.getElementById('forgot-email-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (!supabaseClient) { setAuthFeedback('forgot-email-feedback','Authentication service is unavailable.'); return; }
    recoveryEmail = String(new FormData(form).get('email') || '').trim().toLowerCase();
    setFormBusy(form,true,'Sending code…');
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(recoveryEmail);
      if (error) throw error;
      const destination = document.getElementById('forgot-otp-destination');
      if (destination) destination.textContent = 'Password reset email sent to: ' + recoveryEmail;
      setAuthFeedback('forgot-otp-feedback','Open the password reset email and click its link. You will return to Nexa to choose a new password.',false);
      navigateAuth('forgot-otp');
    } catch (error) {
      setAuthFeedback('forgot-email-feedback',friendlyAuthError(error));
    } finally { setFormBusy(form,false); }
  });

  document.getElementById('reset-password-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const password = document.getElementById('reset-password');
    const confirm = document.getElementById('reset-confirm-password');
    if (password.value !== confirm.value) { setAuthFeedback('reset-password-feedback','Your passwords do not match. Please try again.'); confirm.focus(); return; }
    if (!form.reportValidity()) return;
    if (!supabaseClient) { setAuthFeedback('reset-password-feedback','Authentication service is unavailable.'); return; }
    setFormBusy(form,true,'Saving password…');
    try {
      const { error } = await supabaseClient.auth.updateUser({ password: password.value });
      if (error) throw error;
      await supabaseClient.auth.signOut();
      updateAuthNavigation(null);
      password.value = '';
      confirm.value = '';
      navigateAuth('reset-success');
    } catch (error) {
      setAuthFeedback('reset-password-feedback',friendlyAuthError(error));
    } finally { setFormBusy(form,false); }
  });

  navLogout?.addEventListener('click', async () => {
    if (!supabaseClient) return;
    navLogout.disabled = true;
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      updateAuthNavigation(null);
    } catch (error) {
      console.error('Nexa sign-out failed:', error);
      alert(friendlyAuthError(error));
    } finally { navLogout.disabled = false; }
  });
  
  // Site-wide English/Bangla language selector.
  const languageSelect = document.getElementById('language-select');
  const translations = {
    "Marketplace":"মার্কেটপ্লেস","Categories":"ক্যাটাগরি","How it works":"যেভাবে কাজ করে","Why Nexa":"কেন Nexa",
    "Log in":"লগ ইন","List your asset":"আপনার অ্যাসেট লিস্ট করুন","Sign up":"সাইন আপ",
    "WELCOME TO NEXA":"NEXA-তে স্বাগতম","Your next digital opportunity starts here.":"আপনার পরবর্তী ডিজিটাল সুযোগের যাত্রা শুরু হোক এখানে।","A clearer way to discover, buy and sell digital assets.":"ডিজিটাল অ্যাসেট খোঁজা, কেনা ও বিক্রির আরও স্বচ্ছ উপায়।","Transparent marketplace journey":"স্বচ্ছ মার্কেটপ্লেস যাত্রা","Identity-first seller onboarding":"পরিচয় যাচাইয়ের মাধ্যমে সেলার নিবন্ধন","Secure transaction experience":"নিরাপদ লেনদেনের অভিজ্ঞতা","Create account":"অ্যাকাউন্ট তৈরি করুন","GET STARTED":"শুরু করুন","Create your Nexa account":"আপনার Nexa অ্যাকাউন্ট তৈরি করুন","Enter your details to get started.":"শুরু করতে আপনার তথ্য দিন।","First name":"নামের প্রথম অংশ","Last name":"নামের শেষ অংশ","Country":"দেশ","Select your country":"আপনার দেশ নির্বাচন করুন","Email address":"ইমেইল ঠিকানা","Password":"পাসওয়ার্ড","Create a strong password":"শক্তিশালী পাসওয়ার্ড তৈরি করুন","At least 10 characters":"কমপক্ষে ১০টি অক্ষর","One uppercase and one lowercase letter":"একটি বড় হাতের ও একটি ছোট হাতের অক্ষর","One number and one special character":"একটি সংখ্যা ও একটি বিশেষ চিহ্ন","Confirm password":"পাসওয়ার্ড নিশ্চিত করুন","Enter your password again":"আবার পাসওয়ার্ড লিখুন","I agree to the":"আমি সম্মত","Terms & Conditions":"শর্তাবলি","I have read and agree to the":"আমি পড়েছি এবং সম্মত","Privacy Policy":"গোপনীয়তা নীতি","Send me occasional product updates (optional).":"মাঝে মাঝে পণ্যের আপডেট পেতে চাই (ঐচ্ছিক)।","Already have an account?":"আগে থেকেই অ্যাকাউন্ট আছে?","WELCOME BACK":"আবার স্বাগতম","Log in to Nexa":"Nexa-তে লগ ইন করুন","Access your Nexa account.":"আপনার Nexa অ্যাকাউন্টে প্রবেশ করুন।","Enter your password":"আপনার পাসওয়ার্ড লিখুন","New to Nexa?":"Nexa-তে নতুন?","Create an account":"অ্যাকাউন্ট তৈরি করুন","Your account details should be protected by a secure authentication service when registration is connected.":"নিবন্ধন চালু হলে আপনার অ্যাকাউন্টের তথ্য নিরাপদ অথেনটিকেশন সার্ভিসের মাধ্যমে সুরক্ষিত রাখতে হবে।","Show":"দেখুন","Hide":"লুকান","The sign-up form is ready. Secure account creation will be enabled after the authentication service is connected.":"সাইনআপ ফর্ম প্রস্তুত। অথেনটিকেশন সার্ভিস যুক্ত হলে নিরাপদ অ্যাকাউন্ট তৈরি চালু হবে।","Login is not connected yet. A secure authentication service is required before you can access an account.":"লগইন এখনো সংযুক্ত নয়। অ্যাকাউন্টে প্রবেশের আগে নিরাপদ অথেনটিকেশন সার্ভিস যুক্ত করতে হবে।","Your passwords do not match. Please check and try again.":"পাসওয়ার্ড দুটি মিলছে না। আবার পরীক্ষা করে লিখুন।",
    "EMAIL VERIFICATION":"ইমেইল যাচাই","Check your inbox":"আপনার ইনবক্স দেখুন","Enter the 6-digit verification code sent to your email address.":"আপনার ইমেইলে পাঠানো ৬ সংখ্যার যাচাইকরণ কোড লিখুন।","Verification code":"যাচাইকরণ কোড","Enter 6-digit code":"৬ সংখ্যার কোড লিখুন","Verify email":"ইমেইল যাচাই করুন","Back to sign up":"সাইনআপে ফিরে যান","WELCOME ABOARD":"স্বাগতম","Account created successfully!":"অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!","Your email has been verified. Preparing your Nexa account…":"আপনার ইমেইল যাচাই হয়েছে। Nexa অ্যাকাউন্ট প্রস্তুত করা হচ্ছে…","Taking you to your dashboard":"আপনাকে ড্যাশবোর্ডে নেওয়া হচ্ছে","Forgot password?":"পাসওয়ার্ড ভুলে গেছেন?","ACCOUNT RECOVERY":"অ্যাকাউন্ট পুনরুদ্ধার","Forgot your password?":"পাসওয়ার্ড ভুলে গেছেন?","Enter the email address linked to your Nexa account.":"আপনার Nexa অ্যাকাউন্টের সঙ্গে যুক্ত ইমেইল ঠিকানা লিখুন।","Send verification code":"যাচাইকরণ কোড পাঠান","Back to login":"লগইনে ফিরে যান","VERIFY YOUR EMAIL":"আপনার ইমেইল যাচাই করুন","Enter your reset code":"রিসেট কোড লিখুন","Enter the 6-digit code sent to your registered email.":"আপনার নিবন্ধিত ইমেইলে পাঠানো ৬ সংখ্যার কোড লিখুন।","Verify code":"কোড যাচাই করুন","CREATE A NEW PASSWORD":"নতুন পাসওয়ার্ড তৈরি করুন","Reset your password":"পাসওয়ার্ড রিসেট করুন","Choose a strong password you have not used before.":"আগে ব্যবহার করেননি এমন শক্তিশালী পাসওয়ার্ড বেছে নিন।","New password":"নতুন পাসওয়ার্ড","Create a new password":"নতুন পাসওয়ার্ড লিখুন","Confirm new password":"নতুন পাসওয়ার্ড নিশ্চিত করুন","Confirm your new password":"নতুন পাসওয়ার্ড আবার লিখুন","Save new password":"নতুন পাসওয়ার্ড সংরক্ষণ করুন","ALL SET":"সব প্রস্তুত","Password reset successfully!":"পাসওয়ার্ড সফলভাবে রিসেট হয়েছে!","Your new password is ready. You can now log in to Nexa.":"আপনার নতুন পাসওয়ার্ড প্রস্তুত। এখন Nexa-তে লগইন করতে পারবেন।","Return to login":"লগইনে ফিরে যান","Wrong email or password. Please check your details and try again. (Demo preview — real credentials will be checked by the authentication service.)":"ইমেইল অথবা পাসওয়ার্ড ভুল। অনুগ্রহ করে তথ্য যাচাই করে আবার চেষ্টা করুন। (ডেমো প্রিভিউ—প্রকৃত তথ্য অথেনটিকেশন সার্ভিস যাচাই করবে।)",
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
    "All rights reserved.":"সর্বস্বত্ব সংরক্ষিত।","Designed for confident digital ownership.":"আত্মবিশ্বাসের সঙ্গে ডিজিটাল মালিকানা হস্তান্তরের জন্য তৈরি।",
    "YOUR JOURNEY, MADE CLEAR": "আপনার যাত্রা, আরও সহজ ও স্পষ্ট",
    "From first click to": "প্রথম ক্লিক থেকে",
    "successful handover.": "সফল হস্তান্তর পর্যন্ত।",
    "Five simple stages show how buyers and sellers move through a more confident digital asset transaction.": "পাঁচটি সহজ ধাপে দেখুন কীভাবে ক্রেতা ও বিক্রেতা আত্মবিশ্বাসের সঙ্গে ডিজিটাল অ্যাসেটের লেনদেন সম্পন্ন করেন।",
    "GET STARTED": "শুরু করুন",
    "Create your account.": "অ্যাকাউন্ট তৈরি করুন।",
    "Build your trust.": "আস্থা গড়ে তুলুন।",
    "Join Nexa, complete your profile and verify your identity before listing an asset or taking part in a transaction.": "Nexa-তে যোগ দিন, প্রোফাইল সম্পূর্ণ করুন এবং অ্যাসেট লিস্ট করা বা লেনদেনে অংশ নেওয়ার আগে পরিচয় যাচাই করুন।",
    "Account setup": "অ্যাকাউন্ট তৈরি",
    "Identity verification": "পরিচয় যাচাই",
    "YOUR NEXA PROFILE": "আপনার NEXA প্রোফাইল",
    "Welcome to Nexa": "Nexa-তে স্বাগতম",
    "IDENTITY": "পরিচয়",
    "VERIFIED": "যাচাইকৃত",
    "SELL WITH CLARITY": "স্বচ্ছভাবে বিক্রি করুন",
    "List your digital asset.": "আপনার ডিজিটাল অ্যাসেট লিস্ট করুন।",
    "Show its value.": "এর মূল্য তুলে ধরুন।",
    "Prepare your website, domain, SaaS product or other eligible digital asset listing with clear details for potential buyers.": "সম্ভাব্য ক্রেতাদের জন্য আপনার ওয়েবসাইট, ডোমেইন, SaaS পণ্য বা উপযুক্ত ডিজিটাল অ্যাসেটের বিস্তারিত তথ্য দিয়ে লিস্টিং তৈরি করুন।",
    "Free listing model": "বিনামূল্যে লিস্টিং",
    "Asset details": "অ্যাসেটের বিস্তারিত",
    "NEW LISTING": "নতুন লিস্টিং",
    "ASSET TYPE": "অ্যাসেটের ধরন",
    "Digital business": "ডিজিটাল ব্যবসা",
    "STATUS": "অবস্থা",
    "READY TO REVIEW": "পর্যালোচনার জন্য প্রস্তুত",
    "FIND THE RIGHT FIT": "সঠিক অ্যাসেট খুঁজুন",
    "Discover and choose.": "খুঁজে বেছে নিন।",
    "Connect directly.": "সরাসরি যোগাযোগ করুন।",
    "Buyers explore listings, review available information and discuss the details with sellers before agreeing on the deal.": "ক্রেতারা লিস্টিং দেখবেন, উপলভ্য তথ্য পর্যালোচনা করবেন এবং চুক্তিতে সম্মত হওয়ার আগে বিক্রেতার সঙ্গে বিস্তারিত আলোচনা করবেন।",
    "Explore opportunities": "সুযোগ খুঁজুন",
    "Agree on terms": "শর্তে সম্মত হন",
    "FEATURED ASSET": "বিশেষ অ্যাসেট",
    "Find your next asset": "আপনার পরবর্তী অ্যাসেট খুঁজুন",
    "Explore • Compare • Connect": "খুঁজুন • তুলনা করুন • যোগাযোগ করুন",
    "Find an opportunity": "সুযোগ খুঁজুন",
    "PAYMENT PROTECTION": "পেমেন্ট সুরক্ষা",
    "Pay securely.": "নিরাপদে পেমেন্ট করুন।",
    "Funds stay protected.": "ফান্ড সুরক্ষিত থাকে।",
    "The buyer pays through an enabled payment flow. Funds are handled by an appropriate payment or escrow partner while the agreed transfer takes place.": "ক্রেতা চালু থাকা পেমেন্ট ব্যবস্থার মাধ্যমে অর্থ পরিশোধ করবেন। সম্মত হস্তান্তর চলাকালে উপযুক্ত পেমেন্ট বা এসক্রো পার্টনার অর্থ পরিচালনা করবে।",
    "Secure payment flow": "নিরাপদ পেমেন্ট ব্যবস্থা",
    "Transaction records": "লেনদেনের রেকর্ড",
    "SECURE TRANSACTION": "নিরাপদ লেনদেন",
    "PAYMENT": "পেমেন্ট",
    "PROTECTED": "সুরক্ষিত",
    "Payment received": "পেমেন্ট গ্রহণ করা হয়েছে",
    "Transfer can proceed": "হস্তান্তর শুরু করা যাবে",
    "DEAL COMPLETED": "লেনদেন সম্পন্ন",
    "Transfer and confirm.": "হস্তান্তর ও নিশ্চিত করুন।",
    "Complete the deal.": "চুক্তি সম্পন্ন করুন।",
    "The seller transfers the agreed asset. Once the buyer confirms receipt, the seller's funds are released according to the transaction terms and provider rules.": "বিক্রেতা সম্মত অ্যাসেট হস্তান্তর করবেন। ক্রেতা গ্রহণ নিশ্চিত করলে লেনদেনের শর্ত ও প্রদানকারীর নিয়ম অনুযায়ী বিক্রেতার অর্থ ছেড়ে দেওয়া হবে।",
    "Buyer confirmation": "ক্রেতার নিশ্চিতকরণ",
    "Seller payout": "বিক্রেতার পেমেন্ট",
    "BUYER": "ক্রেতা",
    "Asset received": "অ্যাসেট গ্রহণ করা হয়েছে",
    "Confirmed ✓": "নিশ্চিত ✓",
    "SELLER": "বিক্রেতা",
    "Funds released": "ফান্ড রিলিজ হয়েছে",
    "Transaction complete": "লেনদেন সম্পন্ন",
    "Payment handling and fund release depend on the enabled payment or escrow provider, transaction terms and applicable rules.": "পেমেন্ট পরিচালনা ও অর্থ ছেড়ে দেওয়া চালু থাকা পেমেন্ট বা এসক্রো প্রদানকারী, লেনদেনের শর্ত এবং প্রযোজ্য নিয়মের ওপর নির্ভরশীল।",
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
