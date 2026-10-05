type Account = {role?:string;isVerified?:boolean;isActive?:boolean;registrationPaid?:boolean;registrationStatus?:string;kycLevel?:string;onboarding?:{kycStatus?:string}};
export function accountContinuation(user:Account): string {
  if (user.isVerified !== true) return '/(auth)/confirm-phone';
  if (user.role === 'driver') {
    const kycStatus=user.onboarding?.kycStatus || (user.kycLevel==='full'?'approved':'not_submitted');
    if (!['submitted','approved'].includes(kycStatus)) return '/(auth)/driver-kyc';
    if (user.registrationPaid !== true) return '/(auth)/payment-registration';
    if (user.kycLevel !== 'full' || user.isActive !== true || user.registrationStatus !== 'approved') return '/(auth)/verification-progress';
    return '/(driver)';
  }
  return ['client','passenger'].includes(user.role || '') ? '/(passenger)' : user.role==='agent'? '/(agent)' : '/(admin)';
}
