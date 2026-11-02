import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Download, Sparkles } from "lucide-react";
import { Link } from "wouter";

export default function LastPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20 flex flex-col items-center justify-center">
      
      {/* Background Gradients */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]" />
      </div>

      <main className="container mx-auto px-4 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto space-y-8 p-8 md:p-12 rounded-3xl bg-card/30 backdrop-blur-xl border border-border/50 shadow-2xl"
        >
          <div className="w-20 h-20 mx-auto bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10" />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            You've Arrived!
          </h1>
          
          <p className="text-xl text-muted-foreground">
            This is the final destination (EE). Perfect for a success state, download page, or contact confirmation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full w-full sm:w-auto shadow-lg shadow-primary/25">
              <Download className="mr-2 w-5 h-5" /> Download App
            </Button>
            <Link href="/">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full w-full sm:w-auto bg-transparent">
                Back to Home
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
