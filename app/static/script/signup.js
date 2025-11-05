    const form = document.getElementById('signupForm');
    const email = document.getElementById('email');
    const fullname = document.getElementById('fullname');
    const password = document.getElementById('password');
    const confirm = document.getElementById('confirm');
    const agree = document.getElementById('agree');

    const errName = document.getElementById('err-name');
    const errEmail = document.getElementById('err-email');
    const errPw = document.getElementById('err-pw');
    const errConfirm = document.getElementById('err-confirm');
    const errTerms = document.getElementById('err-terms');

    const pwBar = document.getElementById('pwBar');
    const pwNote = document.getElementById('pwNote');
    const togglePw = document.getElementById('togglePw');

    function validateEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
    function scorePassword(p){
      let score=0;
      if(p.length>=8) score+=1;
      if(/[A-Z]/.test(p)) score+=1;
      if(/[0-9]/.test(p)) score+=1;
      if(/[^A-Za-z0-9]/.test(p)) score+=1;
      return score; 
    }

    password.addEventListener('input', ()=>{
      const s = scorePassword(password.value);
      const percent = (s/4)*100;
      pwBar.style.width = percent + '%';
      if(s<=1) pwNote.textContent = 'Weak — try longer password with numbers and symbols.';
      else if(s==2) pwNote.textContent = 'Fair — add uppercase or symbols.';
      else if(s==3) pwNote.textContent = 'Good — nearly there.';
      else pwNote.textContent = 'Strong password.';
    });

    togglePw.addEventListener('click', ()=>{
      const t = password.type === 'password' ? 'text' : 'password';
      password.type = t; confirm.type = t;
      togglePw.textContent = (t==='text') ? 'Hide' : 'Show';
    });

    form.addEventListener('submit',(e)=>{
      e.preventDefault();
      let ok = true;
      errName.textContent = '';
      errEmail.textContent = '';
      errPw.textContent = '';
      errConfirm.textContent = '';
      errTerms.textContent = '';

      if(!fullname.value.trim()){errName.textContent = 'Please enter your full name.'; ok=false}
      if(!validateEmail(email.value)){errEmail.textContent = 'Enter a valid email address.'; ok=false}
      if(scorePassword(password.value) < 2){errPw.textContent = 'Please choose a stronger password.'; ok=false}
      if(password.value !== confirm.value){errConfirm.textContent = 'Passwords do not match.'; ok=false}
      if(!agree.checked){errTerms.textContent = 'You must agree to the terms to continue.'; ok=false}

      if(!ok) return;

      const payload = {
        name: fullname.value.trim(),
        email: email.value.trim(),
        phone: document.getElementById('phone').value.trim(),
        lang: document.getElementById('lang').value
      };

      const successCard = document.createElement('div');
      successCard.className = 'card';
      successCard.style.padding = '18px';
      successCard.innerHTML = `<strong class="success">Account created</strong><div style="margin-top:8px;color:var(--muted)">Welcome, ${payload.name}! We've sent a confirmation email to ${payload.email}. Check your inbox to verify your email and complete setup.</div><div style="margin-top:12px;text-align:right"><a href=\"{{url_for('signin_page')}}\" class=\"btn primary\">Go to Sign In</a></div>`;

      form.submit();
    });