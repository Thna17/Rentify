// src/pages/StaffAcceptInvitationPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, Shield, Users, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@rentify/shared/ui/card";
import { Button } from "@rentify/shared/ui/button";
import { Input } from "@rentify/shared/ui/input";
import { Label } from "@rentify/shared/ui/label";
import { Alert, AlertDescription } from "@rentify/shared/ui/alert";
import { Separator } from "@rentify/shared/ui/separator";
import { Badge } from "@rentify/shared/ui/badge"
import { useAcceptStaffInvitationMutation } from '@rentify/apis'

export const StaffAcceptInvitation = () => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [invitationInfo, setInvitationInfo] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptStaffInvitationMutation();

  
  // Extract token from URL
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tokenParam = queryParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      // Simulate token validation
      validateToken(tokenParam);
    } else {
      setError('Invitation token is missing');
      setLoading(false);
    }
  }, [location]);
  
  // Simulate token validation API call
  const validateToken = (token) => {
    setLoading(true);
    setError('');
    
    // Simulate API call
    setTimeout(() => {
      // Mock response data
      if (token.length > 30) {
        setInvitationInfo({
          merchantName: 'Rentify Corporation',
          staffName: 'John Doe',
          staffEmail: 'john.doe@example.com',
          permissions: ['manage_products', 'manage_orders', 'manage_invoices'],
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
        });
      } else {
        setError('Invalid or expired invitation token');
      }
      setLoading(false);
    }, 1500);
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  setSubmitting(true);
  setError('');

  if (password !== confirmPassword) {
    setError('Passwords do not match');
    setSubmitting(false);
    return;
  }

  if (calculatePasswordStrength(password) !== 'strong') {
    setError('Please create a stronger password');
    setSubmitting(false);
    return;
  }

  try {
    const res = await acceptInvitation({ token, password }).unwrap();
    setSubmitting(false);
    setSuccess(true);
    
    setTimeout(() => {
      navigate('/staff/login');
    }, 3000);
  } catch (err) {
    setSubmitting(false);
    if (err?.data?.message) {
      setError(err.data.message);
    } else {
      setError('Something went wrong. Please try again.');
    }
  }
};

  
  const calculatePasswordStrength = (pwd) => {
    if (pwd.length === 0) return 'empty';
    if (pwd.length < 8) return 'weak';
    if (!/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[^A-Za-z0-9]/.test(pwd)) return 'medium';
    return 'strong';
  };
  
  const passwordStrength = calculatePasswordStrength(password);
    const strength = useMemo(() => calculatePasswordStrength(password), [password]);
  
      const strengthMeta = (s) => {
    switch (s) {
      case "weak":
        return { width: "33%", colorClass: "bg-destructive", label: "Weak" };
      case "medium":
        return { width: "66%", colorClass: "bg-warning", label: "Medium" };
      case "strong":
        return { width: "100%", colorClass: "bg-success", label: "Strong" };
      default:
        return { width: "0%", colorClass: "bg-muted", label: "" };
    }
  };
  // Password requirements
  const requirements = [
    { id: 1, text: 'At least 8 characters', met: password.length >= 8 },
    { id: 2, text: 'At least one uppercase letter', met: /[A-Z]/.test(password) },
    { id: 3, text: 'At least one number', met: /[0-9]/.test(password) },
    { id: 4, text: 'At least one special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
  
  const allRequirementsMet = requirements.every(req => req.met);
  
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4">
        <Card className="w-full max-w-md shadow-elegant animate-fade-in border-0">
          <div className="h-1 w-full bg-gradient-brand rounded-t-lg" />
          <CardContent className="pt-12 pb-8 text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-success/10 border border-success/20">
              <CheckCircle2 className="h-12 w-12 text-success animate-slide-up" />
            </div>
            <CardTitle className="text-2xl mb-3 font-semibold">
              Account setup complete!
            </CardTitle>
            <CardDescription className="text-base leading-relaxed text-muted-foreground">
              Your staff account has been successfully activated. You'll be redirected to the login page shortly.
            </CardDescription>
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="h-1 w-1 rounded-full bg-primary animate-pulse-gentle" />
              <span>Redirecting in a moment...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-subtle px-4 py-8">
      <div className="container max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6 gap-2 hover-scale focus-visible-ring"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>

        <Card className="shadow-elegant animate-fade-in border-0 overflow-hidden">
          <div className="h-1 w-full bg-gradient-brand" />
          
          <CardHeader className="pb-6 pt-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl mb-2 font-semibold">
              Complete Your Account Setup
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground max-w-md mx-auto">
              Set up your secure password to activate your staff account and start collaborating
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-pulse-gentle rounded-full bg-primary/10" />
                <p className="text-muted-foreground">Validating your invitation...</p>
              </div>
            ) : error && !invitationInfo ? (
              <Alert variant="destructive" className="animate-slide-up">
                <AlertDescription className="text-center">{error}</AlertDescription>
              </Alert>
            ) : (
              invitationInfo && (
                <div className="space-y-6 animate-slide-up">
                  {/* Invitation Details Card */}
                  <div className="rounded-xl border bg-card/50 p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Invitation Details</h3>
                    </div>
                    
                    <div className="grid gap-4">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Organization</span>
                        <span className="font-medium">{invitationInfo.merchantName}</span>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Your Name</span>
                        <span className="font-medium">{invitationInfo.staffName}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground">Email</span>
                        <span className="font-medium text-sm">{invitationInfo.staffEmail}</span>
                      </div>
                      
                      <div className="flex justify-between items-start py-2">
                        <span className="text-sm text-muted-foreground">Permissions</span>
                        <div className="flex flex-wrap gap-1 max-w-48">
                          {invitationInfo.permissions.map((permission) => (
                            <Badge key={permission} variant="secondary" className="text-xs">
                              {permission.replace("manage_", "").replace("_", " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires
                        </span>
                        <span className="text-sm font-medium">
                          {invitationInfo.expiresAt.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Password Form */}
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-base font-medium">
                        Create Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pr-12 h-12 text-base focus-visible-ring"
                          placeholder="Enter a strong password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors focus-visible-ring"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      
                      {/* Password Strength Indicator */}
                      {password && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Password strength</span>
                            <span className={`text-sm font-medium ${
                              strength === 'strong' ? 'text-success' : 
                              strength === 'medium' ? 'text-warning' : 'text-destructive'
                            }`}>
                              {strengthMeta(strength).label}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${strengthMeta(strength).colorClass}`}
                              style={{ width: strengthMeta(strength).width }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Requirements List */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {requirements.map((req) => (
                          <div
                            key={req.id}
                            className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                              req.met ? 'text-success bg-success/5' : 'text-muted-foreground'
                            }`}
                          >
                            <div className={`h-1.5 w-1.5 rounded-full ${
                              req.met ? 'bg-success' : 'bg-muted-foreground/30'
                            }`} />
                            <span className={req.met ? 'line-through opacity-75' : ''}>
                              {req.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="confirm" className="text-base font-medium">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirm"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="pr-12 h-12 text-base focus-visible-ring"
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors focus-visible-ring"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-sm text-destructive flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-destructive" />
                          Passwords do not match
                        </p>
                      )}
                    </div>

                    {error && (
                      <Alert variant="destructive" className="animate-slide-up">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-12 text-base font-medium hover-scale focus-visible-ring"
                      disabled={submitting || !allRequirementsMet || password !== confirmPassword}
                    >
                      {submitting ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-pulse-gentle rounded-full bg-primary-foreground/50" />
                          Setting up your account...
                        </div>
                      ) : (
                        "Activate Account"
                      )}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground leading-relaxed">
                      By activating your account, you agree to our{" "}
                      <a className="underline hover:text-foreground transition-colors" href="#">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a className="underline hover:text-foreground transition-colors" href="#">
                        Privacy Policy
                      </a>
                    </p>
                  </form>
                </div>
              )
            )}
          </CardContent>

          <CardFooter className="justify-center pb-8 pt-4">
            <p className="text-sm text-muted-foreground">
              Need assistance?{" "}
              <a 
                className="underline hover:text-foreground transition-colors" 
                href="mailto:support@rentify.com"
              >
                Contact our support team
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
};


export default StaffAcceptInvitation