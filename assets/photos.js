
/* ================= PHOTO INTERACTIONS ================= */
(function(){
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1 · wipe reveal on enter */
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{threshold:.22});
  document.querySelectorAll('.wipe').forEach(function(el){ io.observe(el); });

  /* 1b · fallback: elements inside pinned/transformed tracks (gallery) never
     fire the observer reliably, so sweep them on scroll as well */
  var wipes = [].slice.call(document.querySelectorAll('.wipe'));
  function sweepWipes(){
    if(!wipes.length) return;
    var vh = innerHeight;
    wipes = wipes.filter(function(el){
      if(el.classList.contains('in')) return false;
      var r = el.getBoundingClientRect();
      if(r.bottom > 40 && r.top < vh - 40 && r.right > 40 && r.left < innerWidth - 40){
        el.classList.add('in'); return false;
      }
      return true;
    });
  }
  /* keep sweeping while any are pending — the pinned track keeps easing
     after the last scroll event, so scroll-only checks miss late arrivals */
  (function wipeLoop(){ if(!wipes.length) return; sweepWipes(); requestAnimationFrame(wipeLoop); })();

  /* 2 · parallax: every photo drifts against its container */
  var pimgs = [].slice.call(document.querySelectorAll('.scene .pimg, .g-img .pimg'));
  var ticking=false;
  function park(){
    ticking=false;
    sweepWipes();
    var vh = innerHeight;
    pimgs.forEach(function(im){
      var host = im.parentElement, r = host.getBoundingClientRect();
      if(r.bottom < -200 || r.top > vh+200) return;
      var p = (r.top + r.height/2 - vh/2) / vh;      /* -1 .. 1 */
      im.style.transform = 'translate3d(0,'+(p*-26).toFixed(2)+'px,0)';
    });
  }
  function onScroll(){ if(!ticking && !reduced){ ticking=true; requestAnimationFrame(park); } }
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll);
  park();

  /* 3 · gallery: skew by scroll velocity */
  var track = document.getElementById('gtrack');
  if(track && !reduced){
    var lastX=0, sk=0;
    (function loop(){
      var m = /translate3d\(([-0-9.]+)px/.exec(track.style.transform||'') ||
              /matrix.*?,\s*([-0-9.]+),\s*[-0-9.]+\)$/.exec(getComputedStyle(track).transform||'');
      var x = m ? parseFloat(m[1]) : 0;
      var v = x - lastX; lastX = x;
      sk += ((Math.max(-9,Math.min(9, v*0.28))) - sk) * 0.12;
      track.querySelectorAll('.g-card').forEach(function(c){
        c.style.setProperty('--sk', sk.toFixed(2)+'deg');
      });
      track.style.setProperty('--skew', sk.toFixed(2)+'deg');
      requestAnimationFrame(loop);
    })();
  }

  /* 4 · hero: real booth photo mode + TAP TO START */
  var boothImg = document.getElementById('heroBooth');
  var boothRig = document.getElementById('boothRig');
  var heroPhoto = document.getElementById('heroPhoto');
  function activatePhotoHero(){
    var canvas = document.getElementById('mirror-canvas');
    if(canvas) canvas.style.display = 'none';
    heroPhoto.style.display = 'block';
    var venue = document.getElementById('heroVenue');
    if(!reduced){
      addEventListener('mousemove', function(e){
        var dx = (e.clientX/innerWidth - .5), dy = (e.clientY/innerHeight - .5);
        if(boothRig) boothRig.style.transform = 'translate(-50%,-50%) translate3d('+(dx*-22)+'px,'+(dy*-14)+'px,0)';
        if(venue) venue.style.transform = 'translate3d('+(dx*14)+'px,'+(dy*10)+'px,0)';
      }, {passive:true});
    }
  }
  if(boothImg){
    if(boothImg.complete && boothImg.naturalWidth) activatePhotoHero();
    else boothImg.addEventListener('load', activatePhotoHero);
  }
})();

/* Lucknow skyline draws itself once it is on screen */
(function(){
  var lk=document.getElementById('lko'); if(!lk) return;
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ lk.classList.add('drawn'); io.disconnect(); } });
  },{threshold:.22});
  io.observe(lk);
})();

/* ================= HERO MIRROR: Touch to Start ================= */
(function(){
  var btn=document.getElementById('btScreen'), msg=document.getElementById('btMsg'),
      flash=document.getElementById('btFlash'), print=document.getElementById('btPrint'),
      photo=document.getElementById('btPhoto'), rig=document.getElementById('boothRig');
  if(!btn) return;
  var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var idleHTML=function(){return '<span class="bt-touch">Touch<br>to Start</span><span class="bt-tap">'+T('Tap the screen')+'</span>';};
  var shots=[].slice.call(document.querySelectorAll('.g-card .pimg')).map(function(i){return i.src;}).filter(Boolean);
  var names=['Aarti &amp; Ankit','Saheliyan','Dadi &amp; Aarav','Papa ka birthday','Pheron ke baad'];
  var k=0, busy=false, timers=[];
  function later(fn,ms){ timers.push(setTimeout(fn,ms)); }
  function reset(){
    print.className='bt-print'; print.style.transform='';
    msg.innerHTML=idleHTML(); busy=false;
  }
  function shoot(){
    if(busy) return; busy=true;
    timers.forEach(clearTimeout); timers=[];
    print.className='bt-print'; print.style.transform='';
    var pick=k++ % Math.max(1,shots.length);
    if(shots.length) photo.src=shots[pick];
    print.querySelector('.bt-names').innerHTML=names[pick % names.length];
    var n=3;
    (function tick(){
      if(n>0){ msg.innerHTML='<span class="bt-count">'+n+'</span>'; n--; later(tick, reduced?250:800); return; }
      flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
      msg.innerHTML='<span class="bt-status">'+T('Printing…')+'</span>';
      later(function(){
        void print.offsetWidth; print.classList.add('out');
      }, reduced?50:450);
      later(function(){
        print.classList.remove('out'); print.classList.add('settle');
        msg.innerHTML='<span class="bt-status">'+T('Your keepsake')+'</span>';
        if(innerWidth<=760){
          /* phone: lift the print up into the mirror so it sits clear of the headline */
          later(function(){
            var rr=rig.getBoundingClientRect(), pr=print.getBoundingClientRect();
            var dy=(rr.top+rr.height*.52)-(pr.top+pr.height/2);
            print.classList.add('lift'); msg.innerHTML='';
            print.style.transform='translate(-50%,'+Math.round(dy)+'px) rotate(-3deg) scale(1.15)';
          }, 500);
        }
      }, reduced?120:2750);
      later(function(){ print.classList.add('gone'); msg.innerHTML=idleHTML(); }, reduced?2400:7200);
      later(reset, reduced?3000:7900);
    })();
  }
  btn.addEventListener('click',function(e){ e.stopPropagation(); shoot(); });
  var ring=document.getElementById('cursorRing');
  if(ring){ btn.addEventListener('mouseenter',function(){ring.classList.add('big');});
            btn.addEventListener('mouseleave',function(){ring.classList.remove('big');}); }
})();

/* ================= BOOKING FORM -> WHATSAPP ================= */
(function(){
  var WA='919140569079';
  var $=function(id){return document.getElementById(id);};
  var form=$('bkForm'); if(!form) return;
  var today=new Date(); today.setHours(0,0,0,0);
  var iso=function(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  $('bkDate').min=iso(today);
  function pretty(v){ if(!v) return '-'; var a=v.split('-').map(Number); return new Date(a[0],a[1]-1,a[2]).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'long',year:'numeric'}); }
  function val(id){ return $(id).value.trim(); }
  function build(){
    var lines=['Namaste 360°E, I would like to check availability.','',
      'Name: '+(val('bkName')||'-'),
      'WhatsApp: '+(val('bkPhone')||'-'),
      'Event: '+val('bkType'),
      'Date: '+pretty(val('bkDate')),
      'Venue: '+(val('bkVenue')||'-'),
      'Start time: '+(val('bkTime')||'-'),
      'Guests: '+(val('bkGuests')||'-'),
      'Package: '+val('bkPkg')];
    if(val('bkNotes')) lines.push('Notes: '+val('bkNotes'));
    var t=lines.join('\n');
    $('bkPreview').textContent=t;
    $('bkSend').href='https://wa.me/'+WA+'?text='+encodeURIComponent(t);
    var d=val('bkDate');
    if(d){ var a=d.split('-').map(Number); if(new Date(a[0],a[1]-1,a[2])<today){ $('bkErr').textContent=T('That date has passed. Please pick a future date.'); return t; } }
    $('bkErr').textContent='';
    return t;
  }
  form.addEventListener('input',build); form.addEventListener('change',build);
  form.addEventListener('submit',function(e){e.preventDefault();});
  $('bkSend').addEventListener('click',function(e){
    if(!val('bkName')||!val('bkDate')){
      e.preventDefault();
      $('bkErr').textContent=T('Please add your name and event date first.');
      (val('bkName')?$('bkDate'):$('bkName')).focus();
    }
  });
  function toast(msg){ var t=document.createElement('div'); t.className='bk-toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(function(){t.remove();},2200); }
  $('bkCopy').addEventListener('click',function(){
    var text=build();
    var fallback=function(){ var r=document.createRange(); r.selectNodeContents($('bkPreview')); var sel=getSelection(); sel.removeAllRanges(); sel.addRange(r); toast(T('Selected. Copy it from the box.')); };
    try{ navigator.clipboard.writeText(text).then(function(){toast(T('Message copied'));},fallback); }catch(_){ fallback(); }
  });
  build();
})();

/* ================= ENGLISH / हिंदी ================= */
(function(){
  var HI={"Tap to start": "शुरू करने के लिए टैप करें", "Experience": "अनुभव", "Gallery": "गैलरी", "Packages": "पैकेज", "FAQ": "सवाल-जवाब", "Book": "बुक करें", "Tap the screen": "स्क्रीन पर टैप करें", "360°E · Lucknow": "360°E · लखनऊ", "Magic mirror photobooth · Lucknow": "मैजिक मिरर फ़ोटोबूथ · लखनऊ", "An evening,": "एक शाम,", "beautifully mirrored.": "आईने में सजी हुई।", "Book your date": "अपनी तारीख बुक करें", "Scroll": "स्क्रॉल करें", "Shaadi": "शादी", "Sangeet": "संगीत", "Birthday": "बर्थडे", "Launches": "लॉन्च", "Instant prints": "इंस्टेंट प्रिंट", "QR sharing": "QR शेयरिंग", "Shaam": "शाम", "Yaadein": "यादें", "Jashn": "जश्न", "The evening": "आपकी शाम", "Ek shaam,": "एक शाम,", "start to finish.": "शुरू से आख़िर तक।", "We arrive first": "हम पहले पहुँचते हैं", "Set up before your first guest walks in.": "आपके पहले मेहमान के आने से पहले सब तैयार।", "7:30 PM · Venue": "शाम 7:30 · वेन्यू", "Your names light up": "आपके नाम जगमगाते हैं", "A custom welcome screen — your names, your date, your colours.": "आपकी अपनी वेलकम स्क्रीन — आपके नाम, आपकी तारीख, आपके रंग।", "Guests take over": "अब मेहमानों की बारी", "Every photo printed on the spot and sent straight to their phone.": "हर फ़ोटो वहीं प्रिंट होती है और सीधे उनके फ़ोन पर पहुँचती है।", "0 photos": "0 फ़ोटो", "Print in hand": "प्रिंट हाथ में", "Thirty seconds. Warm, in an envelope.": "तीस सेकंड। गरमागरम, लिफ़ाफ़े में।", "~30 sec": "~30 सेकंड", "Selected work": "हमारा काम", "Yaadein,": "यादें,", "in frame.": "फ़्रेम में।", "Saheliyan": "सहेलियाँ", "Sangeet · Lucknow": "संगीत · लखनऊ", "Thumbs up": "थम्स अप", "Corporate evening": "कॉर्पोरेट शाम", "Yaar log": "यार लोग", "Reception": "रिसेप्शन", "Parivaar": "परिवार", "Family function": "पारिवारिक समारोह", "Aarti & Ankit": "आरती और अंकित", "In the mirror": "आईने में", "Made in Lucknow · for Lucknow": "लखनऊ में बना · लखनऊ के लिए", "Hazratganj se Gomti Nagar tak —": "हज़रतगंज से गोमती नगर तक —", "we know the way to your venue.": "आपके वेन्यू का रास्ता हमें पता है।", "No jargon": "सीधी बात", "What you": "आपको", "actually get.": "असल में क्या मिलता है।", "sec": "सेकंड", "Photo to print": "फ़ोटो से प्रिंट तक", "In your guest's hand before they walk away.": "मेहमान के जाने से पहले उसके हाथ में।", "Unlimited prints": "अनलिमिटेड प्रिंट", "In Signature and Luxury, every guest prints as many times as they like. Essential includes up to 200.": "Signature और Luxury में हर मेहमान जितने चाहे उतने प्रिंट ले सकता है। Essential में 200 तक प्रिंट शामिल हैं।", "Photo layouts": "फ़ोटो लेआउट", "Single, double, 4-photo strip or a full 4×6 — you pick.": "सिंगल, डबल, 4-फ़ोटो स्ट्रिप या पूरा 4×6 — आप चुनिए।", "Custom designed": "आपके लिए डिज़ाइन", "Your names, date and colours on every print. Premium lab-grade paper.": "हर प्रिंट पर आपके नाम, तारीख और रंग। प्रीमियम लैब-ग्रेड पेपर।", "Choose your experience": "अपना अनुभव चुनिए", "Har jashn ka": "हर जश्न का", "apna package.": "अपना पैकेज।", "Intimate gatherings": "छोटे, ख़ास समारोह", "Worth": "असल क़ीमत", "3 hours": "3 घंटे", "5 hours": "5 घंटे", "8 hours": "8 घंटे", "You save ₹6,000": "आपकी बचत ₹6,000", "You save ₹12,500": "आपकी बचत ₹12,500", "You save ₹18,000": "आपकी बचत ₹18,000", "Magic mirror photo booth": "मैजिक मिरर फ़ोटो बूथ", "Up to 200 instant prints + QR sharing": "200 तक इंस्टेंट प्रिंट + QR शेयरिंग", "3 custom template designs": "3 कस्टम टेम्पलेट डिज़ाइन", "1 host · setup & dismantling": "1 होस्ट · सेटअप और पैक-अप", "What it's worth": "पूरा हिसाब", "Magic mirror booth with 3 custom designs, 3 hrs": "3 कस्टम डिज़ाइन के साथ मैजिक मिरर बूथ, 3 घंटे", "Booth operator, 3 hrs": "बूथ ऑपरेटर, 3 घंटे", "Transport, setup & dismantling": "ट्रांसपोर्ट, सेटअप और पैक-अप", "If you bought it separately": "अलग-अलग लेने पर", "Your price": "आपकी क़ीमत", "Pehli pasand": "पहली पसंद", "The full evening": "पूरी शाम", "Everything in Essential": "Essential का सब कुछ", "Unlimited instant prints + photo strips": "अनलिमिटेड इंस्टेंट प्रिंट + फ़ोटो स्ट्रिप", "5 custom template designs · AI photo experience": "5 कस्टम टेम्पलेट डिज़ाइन · AI फ़ोटो एक्सपीरियंस", "Premium backdrop · envelopes · props · 1 host": "प्रीमियम बैकड्रॉप · लिफ़ाफ़े · प्रॉप्स · 1 होस्ट", "Magic mirror booth with 5 custom designs, 5 hrs": "5 कस्टम डिज़ाइन के साथ मैजिक मिरर बूथ, 5 घंटे", "Unlimited instant prints, photo strips + QR sharing": "अनलिमिटेड इंस्टेंट प्रिंट, फ़ोटो स्ट्रिप + QR शेयरिंग", "AI photo experience": "AI फ़ोटो एक्सपीरियंस", "Premium backdrop, envelopes + props": "प्रीमियम बैकड्रॉप, लिफ़ाफ़े + प्रॉप्स", "Booth operator, 5 hrs": "बूथ ऑपरेटर, 5 घंटे", "Shahi experience": "शाही अनुभव", "Grand affairs": "बड़े और भव्य आयोजन", "Everything in Signature": "Signature का सब कुछ", "10 custom template designs · luxury backdrop": "10 कस्टम टेम्पलेट डिज़ाइन · लग्ज़री बैकड्रॉप", "Photo frames for guests · custom branding": "मेहमानों के लिए फ़ोटो फ़्रेम · कस्टम ब्रांडिंग", "2 hosts · VIP assistance": "2 होस्ट · VIP सहायता", "Magic mirror booth with 10 custom designs, 8 hrs": "10 कस्टम डिज़ाइन के साथ मैजिक मिरर बूथ, 8 घंटे", "Luxury backdrop, envelopes + props": "लग्ज़री बैकड्रॉप, लिफ़ाफ़े + प्रॉप्स", "Guest photo frames + custom branding": "मेहमानों के फ़ोटो फ़्रेम + कस्टम ब्रांडिंग", "2 booth operators, 8 hrs": "2 बूथ ऑपरेटर, 8 घंटे", "Corporate events & installations": "कॉर्पोरेट इवेंट और इंस्टॉलेशन", "Quote after consultation · WhatsApp +91 91405 69079": "बात करके कोटेशन · WhatsApp +91 91405 69079", "Extra prints beyond 200 (Essential) ₹30 each · Extra hours on request": "200 से ज़्यादा प्रिंट (Essential) ₹30 प्रति प्रिंट · ज़्यादा घंटे अनुरोध पर", "Our guarantee": "हमारी गारंटी", "We put it": "हम लिखकर", "in writing.": "देते हैं।", "Booth ready 60 minutes before your first guest.": "पहले मेहमान से 60 मिनट पहले बूथ तैयार।", "Or ₹2,000 off": "वरना ₹2,000 की छूट", "Your design, approved by you before the day — names, date and colours on every print.": "आपका डिज़ाइन, इवेंट से पहले आपकी मंज़ूरी से — हर प्रिंट पर नाम, तारीख और रंग।", "Or we redesign it free": "वरना दोबारा डिज़ाइन मुफ़्त", "No breaks. If the booth stops for more than 15 minutes, you don’t pay for that hour.": "कोई रुकावट नहीं। बूथ 15 मिनट से ज़्यादा रुका, तो उस घंटे का पैसा नहीं।", "That hour is free": "वह घंटा मुफ़्त", "Every photo in your online gallery by the next morning.": "अगली सुबह तक हर फ़ोटो आपकी ऑनलाइन गैलरी में।", "Dates fill fast in season": "सीज़न में तारीखें जल्दी भरती हैं", "Let's lock": "आइए, आपकी", "your date.": "तारीख पक्की करें।", "Send your details": "अपनी जानकारी भेजें", "Fill the form. It opens WhatsApp with everything filled in.": "फ़ॉर्म भरें। WhatsApp सारी जानकारी के साथ खुल जाएगा।", "We confirm": "हम कन्फ़र्म करते हैं", "We check the date and share payment details to lock it.": "हम तारीख चेक करके उसे पक्का करने के लिए पेमेंट की जानकारी भेजते हैं।", "Approve the design": "डिज़ाइन मंज़ूर करें", "We send your print layouts. You pick and approve.": "हम प्रिंट लेआउट भेजते हैं। आप चुनकर मंज़ूर करें।", "Enjoy the evening": "शाम का मज़ा लें", "We set up before guests arrive and pack up after.": "मेहमानों के आने से पहले सेटअप, और बाद में पैक-अप, सब हमारा।", "Your name": "आपका नाम", "WhatsApp number": "WhatsApp नंबर", "Event": "इवेंट", "Wedding": "शादी", "Engagement": "सगाई", "Sangeet / Haldi / Mehendi": "संगीत / हल्दी / मेहंदी", "Anniversary": "सालगिरह", "Corporate event": "कॉर्पोरेट इवेंट", "Brand launch / activation": "ब्रांड लॉन्च / एक्टिवेशन", "Puja / festival": "पूजा / त्योहार", "Other": "अन्य", "Event date": "इवेंट की तारीख", "Venue and area": "वेन्यू और इलाका", "Start time": "शुरू होने का समय", "Expected guests": "अनुमानित मेहमान", "Package": "पैकेज", "Essential · 3 hours · ₹15,000": "Essential · 3 घंटे · ₹15,000", "Signature · 5 hours · ₹30,000": "Signature · 5 घंटे · ₹30,000", "Luxury · 8 hours · ₹45,000": "Luxury · 8 घंटे · ₹45,000", "Corporate event · need a quote": "कॉर्पोरेट इवेंट · कोटेशन चाहिए", "Not sure yet, help me choose": "अभी तय नहीं, चुनने में मदद करें", "Anything else": "कुछ और", "Your message": "आपका मैसेज", "Send on WhatsApp": "WhatsApp पर भेजें", "Copy message": "मैसेज कॉपी करें", "Or message us directly:": "या सीधे मैसेज करें:", "Questions": "सवाल", "Before": "बुकिंग से", "you book.": "पहले।", "Is this a 360° spinning video booth?": "क्या यह 360° घूमने वाला वीडियो बूथ है?", "No. 360°E is our name. Our booth is a full-length interactive magic mirror that takes photos and prints them on the spot.": "नहीं। 360°E हमारा नाम है। हमारा बूथ एक फ़ुल-लेंथ इंटरैक्टिव मैजिक मिरर है, जो फ़ोटो लेता है और वहीं प्रिंट करता है।", "Do guests get their photos right away?": "क्या मेहमानों को फ़ोटो तुरंत मिलती है?", "Yes. Prints come out in about 30 seconds, and guests can scan a QR code to get their photos on their phone.": "हाँ। करीब 30 सेकंड में प्रिंट निकल आता है, और मेहमान QR कोड स्कैन करके फ़ोटो अपने फ़ोन पर ले सकते हैं।", "How many prints do we get?": "हमें कितने प्रिंट मिलेंगे?", "Essential includes up to 200 prints, and extra prints are ₹30 each. Signature and Luxury include unlimited prints for your booked hours.": "Essential में 200 तक प्रिंट शामिल हैं, उसके बाद हर प्रिंट ₹30 का। Signature और Luxury में बुक किए गए घंटों तक अनलिमिटेड प्रिंट।", "Can the print match our theme?": "क्या प्रिंट हमारी थीम से मैच हो सकता है?", "Yes. We design the layouts with your names, date and colours (3, 5 or 10 designs depending on your package), and you approve them before the event.": "हाँ। हम आपके नाम, तारीख और रंगों के साथ लेआउट डिज़ाइन करते हैं (पैकेज के हिसाब से 3, 5 या 10 डिज़ाइन), और इवेंट से पहले आप उन्हें मंज़ूर करते हैं।", "Who operates the booth?": "बूथ कौन चलाता है?", "Our host stays with the booth for your whole booking: 1 host in Essential and Signature, 2 in Luxury. We set up before guests arrive, keep the queue moving and pack up after.": "हमारा होस्ट पूरी बुकिंग के दौरान बूथ पर रहता है: Essential और Signature में 1 होस्ट, Luxury में 2। हम मेहमानों के आने से पहले सेटअप करते हैं, लाइन चलाते रहते हैं और बाद में पैक-अप करते हैं।", "Do you come outside Lucknow?": "क्या आप लखनऊ के बाहर भी आते हैं?", "Lucknow is our base, and transport within Lucknow is included. For other cities, send us the venue on WhatsApp and we will tell you the travel cost.": "लखनऊ हमारा बेस है और लखनऊ के अंदर ट्रांसपोर्ट शामिल है। दूसरे शहरों के लिए WhatsApp पर वेन्यू भेजें, हम सफ़र का ख़र्च बता देंगे।", "How do I lock my date?": "अपनी तारीख कैसे पक्की करें?", "Send your details through the form above. We confirm the date on WhatsApp and share payment details. Your date is locked once the booking payment is received.": "ऊपर दिए फ़ॉर्म से अपनी जानकारी भेजें। हम WhatsApp पर तारीख कन्फ़र्म करके पेमेंट की जानकारी भेजेंगे। बुकिंग पेमेंट मिलते ही आपकी तारीख पक्की।", "Your evening could be": "अगली यादगार शाम", "next.": "आपकी हो सकती है।", "Book on WhatsApp": "WhatsApp पर बुक करें", "Magic mirror photobooth for weddings, family functions and corporate evenings in Lucknow.": "लखनऊ में शादियों, पारिवारिक समारोहों और कॉर्पोरेट शामों के लिए मैजिक मिरर फ़ोटोबूथ।", "Explore": "देखें", "Contact": "संपर्क", "Events across Lucknow": "पूरे लखनऊ में इवेंट", "Made in Lucknow": "लखनऊ में बना", "photos": "फ़ोटो", "Printing…": "प्रिंट हो रहा है…", "Your keepsake": "आपकी यादगार", "Please add your name and event date first.": "पहले अपना नाम और इवेंट की तारीख भरें।", "That date has passed. Please pick a future date.": "यह तारीख निकल चुकी है। आगे की कोई तारीख चुनें।", "Message copied": "मैसेज कॉपी हो गया", "Selected. Copy it from the box.": "चुन लिया गया। बॉक्स से कॉपी करें।"};
  var PH={"Full name": "पूरा नाम", "10-digit mobile": "10 अंकों का मोबाइल नंबर", "e.g. Hotel name, Gomti Nagar": "जैसे होटल का नाम, गोमती नगर", "e.g. 300": "जैसे 300", "Names for the print, theme colours, anything we should know": "प्रिंट के लिए नाम, थीम के रंग, या कुछ और जो हमें जानना चाहिए"};
  var QUOTE={"en": "\"Shaam guzar jaati hai. Print reh jaati hai.\"", "hi": "\"शाम गुज़र जाती है। प्रिंट रह जाता है।\""};
  var lang='en';
  window.T=function(t){ return lang==='hi' && HI[t] ? HI[t] : t; };
  /* the WhatsApp message always reaches you in English */
  document.querySelectorAll('#bkForm option').forEach(function(o){ if(!o.hasAttribute('value')) o.value=o.textContent.trim(); });
  var nodes=[], walker=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
  while((n=walker.nextNode())){
    var pe=n.parentElement; if(!pe || /^(SCRIPT|STYLE)$/.test(pe.tagName)) continue;
    if(pe.closest('#qline')) continue;
    var key=n.nodeValue.trim().replace(/\s+/g,' ');
    if(key && HI[key]) nodes.push({n:n, en:n.nodeValue, key:key});
  }
  var phs=[].slice.call(document.querySelectorAll('[placeholder]')).filter(function(e){return PH[e.placeholder];}).map(function(e){return {e:e,en:e.placeholder};});
  var btn=document.getElementById('langBtn');
  function setQuote(){
    var q=document.getElementById('qline'); if(!q) return;
    var words=QUOTE[lang].split(' ');
    var spans=q.querySelectorAll('.qw');
    if(spans.length===words.length){ spans.forEach(function(sp,i){ sp.textContent=words[i]; }); }
    else { q.innerHTML=words.map(function(w){return '<span class="qw" style="opacity:1">'+w+'</span>';}).join(' '); }
  }
  function apply(l){
    lang=l; document.documentElement.lang=l;
    nodes.forEach(function(o){ var t=o.en.trim(); o.n.nodeValue = l==='hi' ? o.en.replace(t, HI[o.key]) : o.en; });
    phs.forEach(function(o){ o.e.placeholder = l==='hi' ? PH[o.en] : o.en; });
    var tap=document.querySelector('#btMsg .bt-tap'); if(tap) tap.textContent=T('Tap the screen');
    setQuote();
    if(btn){ btn.textContent = l==='hi' ? 'English' : 'हिंदी'; btn.lang = l==='hi' ? 'en' : 'hi';
             btn.setAttribute('aria-label', l==='hi' ? 'Read in English' : 'हिंदी में पढ़ें'); }
    try{ localStorage.setItem('360e-lang', l); }catch(_){}
    if(window.ScrollTrigger) setTimeout(function(){ ScrollTrigger.refresh(); }, 80);
  }
  var saved=null; try{ saved=localStorage.getItem('360e-lang'); }catch(_){}
  var start = saved || ((navigator.languages||[navigator.language||'']).some(function(x){return /^hi/i.test(x);}) ? 'hi' : 'en');
  if(btn) btn.addEventListener('click', function(e){ e.preventDefault(); apply(lang==='hi' ? 'en' : 'hi'); });
  if(start==='hi') apply('hi');
})();

/* refresh scroll positions as lazy images arrive */
(function(){var t;document.querySelectorAll('img[loading=lazy]').forEach(function(i){if(!i.complete)i.addEventListener('load',function(){clearTimeout(t);t=setTimeout(function(){if(window.ScrollTrigger)ScrollTrigger.refresh();},150);});});})();
