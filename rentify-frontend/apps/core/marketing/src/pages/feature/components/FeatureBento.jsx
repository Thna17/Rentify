import React from 'react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SHOWCASE } from '../../../data/templateMedia';
import { BrowserFrame, Screen } from '../../../components/site/DeviceFrames';
import { Reveal, Stagger, StaggerItem } from '../../../components/site/motion';
import { KhqrCard } from '../../../components/site/mockups/PaymentMocks';
import {
  InvoiceCard,
  OrdersList,
  SalesChart,
  TelegramStack,
} from '../../../components/site/mockups/CommerceMocks';
import { Container, Heading, Lead, Section, Tile } from '../../../components/site/ui';

const TileText = ({ label, title, className }) => (
  <div className={cn('relative z-10', className)}>
    <p className="text-[14px] font-semibold text-[#6e6e73] md:text-[15px]">{label}</p>
    <h3 className="mt-2 whitespace-pre-line text-[26px] font-semibold leading-[1.12] tracking-[-0.02em] text-[#1d1d1f] md:text-[30px]">
      {title}
    </h3>
  </div>
);

const FeatureBento = () => {
  const { t } = useLanguage();
  const key = (name) => `site.features.bento.${name}`;

  return (
    <Section id="tools" tone="white" className="pt-8 md:pt-12">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Heading size="xl">{t(key('title'))}</Heading>
          </Reveal>
          <Reveal delay={0.1}>
            <Lead className="mt-5">{t(key('lead'))}</Lead>
          </Reveal>
        </div>

        <Stagger className="mt-16 grid gap-4 md:mt-20 md:grid-cols-6 md:gap-5" stagger={0.1}>
          <StaggerItem className="md:col-span-6 lg:col-span-4 lg:row-span-2">
            <Tile className="group flex h-full min-h-[340px] flex-col p-8 sm:min-h-[460px] md:min-h-[560px] md:p-10 2xl:min-h-[680px] 2xl:p-12">
              <TileText label={t(key('store.label'))} title={t(key('store.title'))} />
              <div className="relative mt-10 flex-1">
                <div className="absolute -right-[18%] top-0 w-[112%] transition-transform duration-700 ease-out group-hover:-translate-x-3 md:w-[105%]">
                  <BrowserFrame url={SHOWCASE.tech.domain}>
                    <Screen
                      src={SHOWCASE.tech.desktop}
                      alt={`${SHOWCASE.tech.storeName} storefront`}
                      className="h-auto"
                    />
                  </BrowserFrame>
                </div>
              </div>
            </Tile>
          </StaggerItem>

          <StaggerItem className="md:col-span-3 lg:col-span-2">
            <Tile className="flex h-full min-h-[460px] flex-col p-8 md:min-h-0">
              <TileText label={t(key('khqr.label'))} title={t(key('khqr.title'))} />
              <div className="mt-8 flex flex-1 items-end justify-center">
                <KhqrCard className="w-[210px] 2xl:w-[250px] translate-y-12 transition-transform duration-700 hover:translate-y-8" />
              </div>
            </Tile>
          </StaggerItem>

          <StaggerItem className="md:col-span-3 lg:col-span-2">
            <Tile className="flex h-full flex-col p-8">
              <TileText label={t(key('analytics.label'))} title={t(key('analytics.title'))} />
              <SalesChart className="mt-8" />
            </Tile>
          </StaggerItem>

          <StaggerItem className="md:col-span-3 lg:col-span-2">
            <Tile className="flex h-full flex-col p-8">
              <TileText label={t(key('orders.label'))} title={t(key('orders.title'))} />
              <div className="mt-8 flex flex-1 items-end justify-center">
                <OrdersList />
              </div>
            </Tile>
          </StaggerItem>

          <StaggerItem className="md:col-span-3 lg:col-span-2">
            <Tile className="flex h-full min-h-[420px] flex-col p-8">
              <TileText label={t(key('invoices.label'))} title={t(key('invoices.title'))} />
              <div className="mt-8 flex flex-1 items-end justify-center">
                <InvoiceCard className="translate-y-10" />
              </div>
            </Tile>
          </StaggerItem>

          <StaggerItem className="md:col-span-6 lg:col-span-2">
            <Tile className="flex h-full min-h-[360px] flex-col p-8">
              <TileText label={t(key('telegram.label'))} title={t(key('telegram.title'))} />
              <div className="mt-8 flex flex-1 items-start justify-center pb-10">
                <TelegramStack />
              </div>
            </Tile>
          </StaggerItem>
        </Stagger>
      </Container>
    </Section>
  );
};

export default FeatureBento;
