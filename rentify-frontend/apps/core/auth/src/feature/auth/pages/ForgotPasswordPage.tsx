// src/pages/ForgotPasswordPage.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useForgotPassword } from '../hooks/useForgotPassword';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@rentify/shared/ui/form';
import { Input } from '@rentify/shared/ui/input';
import { Button } from '@rentify/shared/ui/button';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@rentify/shared/ui/tabs';
import {
  Mail,
  Phone,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Shield,
} from 'lucide-react';

interface RequestFormData {
  contact: string;
}

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [inputMode, setInputMode] = useState<'email' | 'phone'>('email');

  const {
    error,
    success,
    loading,
    handleRequestReset,
    formatCambodianPhone,
    validateCambodianPhone,
    isWebsiteTemplate,
  } = useForgotPassword();

  const form = useForm<RequestFormData>({
    defaultValues: {
      contact: '',
    },
  });

  const onSubmitRequest = (data: RequestFormData) => {
    const formattedContact =
      inputMode === 'phone' ? formatCambodianPhone(data.contact) : data.contact;
    handleRequestReset(formattedContact);
  };

  const handleInputModeChange = (mode: 'email' | 'phone') => {
    setInputMode(mode);
    form.setValue('contact', '');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg mx-auto mb-4 flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-br bg-clip-text text-transparent from-slate-900 to-slate-700 mb-2">
            Reset Your Password
          </h1>
          <p className="text-slate-600">
            Enter your email or phone to reset your password
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold">
              Forgot your password?
            </CardTitle>
            <CardDescription>
              We'll send you instructions to reset your password
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitRequest)}
                className="space-y-4"
              >
                {/* Contact Method Tabs */}
                <Tabs
                  value={inputMode}
                  onValueChange={(value) => {
                    if (value === 'email' || value === 'phone')
                      handleInputModeChange(value);
                  }}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="email"
                      className="flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      Email
                    </TabsTrigger>
                    <TabsTrigger
                      value="phone"
                      className="flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      Phone
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Contact Field */}
                <FormField
                  control={form.control}
                  name="contact"
                  rules={{
                    required: 'Email or phone number is required',
                    validate: (value) => {
                      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                      const isPhone = validateCambodianPhone(value);
                      return (
                        isEmail ||
                        isPhone ||
                        'Please enter a valid email or phone number'
                      );
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {inputMode === 'email'
                          ? 'Email Address'
                          : 'Phone Number'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type={inputMode === 'email' ? 'email' : 'tel'}
                          placeholder={
                            inputMode === 'email'
                              ? 'your.email@example.com'
                              : 'e.g. (855) 123-456789'
                          }
                          onChange={(e) => {
                            if (inputMode === 'phone') {
                              field.onChange(
                                formatCambodianPhone(e.target.value)
                              );
                            } else {
                              field.onChange(e.target.value);
                            }
                          }}
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Error Alert */}
                {error && (
                  <Alert
                    variant="destructive"
                    className="animate-in fade-in-80"
                  >
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Success Alert */}
                {success && (
                  <Alert className="animate-in slide-in-from-top-5 bg-emerald-50 border-emerald-200">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-800">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 from-orange-600 to-red-500 hover:from-orange-700 hover:to-red-600 text-white font-medium shadow-lg shadow-orange-500/25 transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending instructions...
                    </>
                  ) : (
                    'Send Reset Instructions'
                  )}
                </Button>

                {/* Back to login link */}
                <div className="text-center pt-4 border-t border-slate-200">
                  <Button
                    variant="link"
                    className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-700"
                    onClick={() => navigate('/login')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to sign in
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
