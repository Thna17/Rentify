import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Textarea } from '@rentify/shared/ui/textarea';
import { Label } from '@rentify/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@rentify/shared/ui/dialog';
import { X, CheckCircle2 } from 'lucide-react';

const CTASection = () => {
  const [openModal, setOpenModal] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add your form submission logic here
    setFormSubmitted(true);
  };

  return (
    <div className="relative overflow-hidden mt-8 py-16 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated Particles */}
      <div className="absolute inset-0">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-blue-400/30 to-purple-400/30 animate-particles"
            style={{
              width: `${Math.random() * 15 + 5}px`,
              height: `${Math.random() * 15 + 5}px`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 5 + 5}s`,
            }}
          />
        ))}
      </div>

      <div className="container relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-black text-4xl md:text-5xl lg:text-6xl mb-6 bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
            Need Expert Guidance?
          </h2>
        </motion.div>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
            Get personalized template recommendations from our digital experts
            in under 24 hours
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex justify-center"
        >
          <Button
            onClick={() => setOpenModal(true)}
            className="px-12 py-6 h-auto text-lg font-semibold rounded-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 transition-all duration-300"
          >
            Consult Now
          </Button>
        </motion.div>
      </div>

      {/* Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-md bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              How Can We Help?
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-white/80 hover:text-white"
              onClick={() => {
                setOpenModal(false);
                setFormSubmitted(false);
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          {!formSubmitted ? (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/90">
                  Your Name
                </Label>
                <Input
                  id="name"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/90">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40"
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-white/90">
                  Message
                </Label>
                <Textarea
                  id="message"
                  rows={4}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40 resize-none"
                  placeholder="Tell us about your project..."
                />
              </div>

              <Button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg"
              >
                Send Message
              </Button>
            </motion.form>
          ) : (
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-center space-y-4 py-4"
            >
              <CheckCircle2 className="h-20 w-20 text-green-400 mx-auto mb-4 drop-shadow-lg" />
              <h3 className="text-2xl font-bold text-white">
                Message Received!
              </h3>
              <p className="text-white/80 text-lg leading-relaxed">
                Our experts will contact you within 24 hours with personalized
                recommendations.
              </p>
              <Button
                variant="outline"
                onClick={() => setOpenModal(false)}
                className="px-8 rounded-full border-white/30 text-white hover:bg-white/10 hover:border-white/50 mt-4"
              >
                Close
              </Button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @keyframes particles {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-1000px) rotate(720deg); opacity: 0; }
        }
        .animate-particles {
          animation: particles 10s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default CTASection;