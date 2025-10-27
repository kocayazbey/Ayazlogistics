import { NextIntlClientProvider } from 'next-intl';

export default function NextIntlProvider({ children, messages }: { children: React.ReactNode; messages: any }) {
  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
