import React from 'react';
import { ArrowUpRight, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { teamMembers } from '../../data/teamMember';
import SiteLayout from '../../components/site/SiteLayout';
import CtaBand from '../../components/site/CtaBand';
import PhoneFan from './components/PhoneFan';
import { CONTACT } from '../../data/contact';
import { Reveal, Stagger, StaggerItem, WordReveal } from '../../components/site/motion';
import {
  Container,
  Eyebrow,
  Heading,
  Lead,
  Section,
  SmartLink,
} from '../../components/site/ui';

const VALUES = ['local', 'simple', 'fair'];

const TeamCard = ({ member }) => {
  const links = (member.socials || []).filter((social) => social.url && social.url !== '#');

  return (
    <article className="group">
      <div className="aspect-[4/5] overflow-hidden rounded-[28px] bg-[#f5f5f7]">
        <img
          src={member.image}
          alt={member.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover mix-blend-multiply grayscale transition duration-700 ease-out group-hover:scale-[1.03] group-hover:grayscale-0"
        />
      </div>
      <h3 className="mt-6 text-[21px] font-semibold tracking-[-0.015em] text-[#1d1d1f]">
        {member.name}
      </h3>
      <p className="mt-1 text-[15px] text-[#6e6e73]">{member.position}</p>
      {links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
          {links.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-[15px] text-[#0066cc] hover:underline"
            >
              {social.name}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      )}
    </article>
  );
};

const ContactTile = ({ icon: Icon, label, value, to }) => (
  <SmartLink
    to={to}
    className="group flex flex-col rounded-[28px] bg-white p-8 transition-shadow duration-500 hover:shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)] md:p-10"
  >
    <Icon className="h-7 w-7 text-[#1d1d1f]" strokeWidth={1.4} />
    <p className="mt-8 text-[15px] text-[#6e6e73]">{label}</p>
    <p className="mt-1 flex items-center gap-1 text-[19px] font-semibold text-[#1d1d1f] md:text-[21px]">
      {value}
      <ArrowUpRight className="h-4 w-4 text-[#86868b] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </p>
  </SmartLink>
);

const AboutPage = () => {
  const { t, language } = useLanguage();

  return (
    <SiteLayout title={t('site.about.title')}>
      <section className="bg-white pb-10 pt-16 md:pb-16 md:pt-28">
        <Container className="text-center">
          <Reveal y={16}>
            <Eyebrow>{t('site.about.hero.eyebrow')}</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <Heading as="h1" size="display" className="mt-3">
              {t('site.about.hero.title')}
            </Heading>
          </Reveal>
          <Reveal delay={0.16}>
            <Lead className="mx-auto mt-6 max-w-2xl">{t('site.about.hero.lead')}</Lead>
          </Reveal>
        </Container>
        <div className="mt-16 md:mt-20">
          <PhoneFan />
        </div>
      </section>

      <Section id="mission" tone="white" className="pt-16 md:pt-24">
        <Container className="max-w-[1240px]">
          <Reveal>
            <Eyebrow className="text-[#86868b]">{t('site.about.mission.eyebrow')}</Eyebrow>
          </Reveal>
          <WordReveal
            text={t('site.about.mission.text')}
            className={
              language === 'KH'
                ? 'mt-6 text-[26px] font-semibold leading-[1.6] text-[#1d1d1f] md:text-[40px] md:leading-[1.55] 2xl:text-[48px]'
                : 'mt-6 text-[30px] font-semibold leading-[1.2] tracking-[-0.02em] text-[#1d1d1f] md:text-[48px] md:leading-[1.15] 2xl:text-[60px]'
            }
          />
        </Container>
      </Section>

      <Section tone="gray">
        <Container>
          <Reveal>
            <Heading size="xl" className="text-center">
              {t('site.about.values.title')}
            </Heading>
          </Reveal>
          <Stagger className="mt-16 grid gap-12 md:mt-20 md:grid-cols-3 md:gap-10">
            {VALUES.map((value, index) => (
              <StaggerItem key={value} className="border-t border-black/15 pt-6">
                <p className="text-[15px] font-semibold tabular-nums text-[#86868b]">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-4 text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                  {t(`site.about.values.${value}.title`)}
                </h3>
                <p className="mt-3 text-[17px] leading-snug text-[#6e6e73]">
                  {t(`site.about.values.${value}.body`)}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      <Section id="team" tone="white">
        <Container>
          <div className="max-w-2xl">
            <Reveal>
              <Heading size="xl">{t('site.about.team.title')}</Heading>
            </Reveal>
            <Reveal delay={0.1}>
              <Lead className="mt-6">{t('site.about.team.lead')}</Lead>
            </Reveal>
          </div>
          <Stagger className="mt-16 grid gap-x-6 gap-y-14 sm:grid-cols-2 md:mt-20 lg:grid-cols-3" stagger={0.12}>
            {teamMembers.map((member) => (
              <StaggerItem key={member.name}>
                <TeamCard member={member} />
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      <Section id="contact" tone="gray">
        <Container>
          <div className="max-w-2xl">
            <Reveal>
              <Heading size="xl">{t('site.about.contact.title')}</Heading>
            </Reveal>
            <Reveal delay={0.1}>
              <Lead className="mt-6">{t('site.about.contact.lead')}</Lead>
            </Reveal>
          </div>
          <Stagger className="mt-14 grid gap-5 md:mt-16 md:grid-cols-3">
            <StaggerItem>
              <ContactTile
                icon={Mail}
                label={t('site.about.contact.email')}
                value={CONTACT.email}
                to={`mailto:${CONTACT.email}`}
              />
            </StaggerItem>
            <StaggerItem>
              <ContactTile
                icon={Send}
                label={t('site.about.contact.telegram')}
                value={CONTACT.telegram}
                to={CONTACT.telegramHref}
              />
            </StaggerItem>
            <StaggerItem>
              <ContactTile
                icon={Phone}
                label={t('site.about.contact.phone')}
                value={CONTACT.phone}
                to={CONTACT.phoneHref}
              />
            </StaggerItem>
          </Stagger>
          <Reveal className="mt-10 flex items-center gap-2 text-[15px] text-[#6e6e73]">
            <MapPin className="h-4 w-4" strokeWidth={1.6} />
            {t('site.about.contact.location')}
          </Reveal>
        </Container>
      </Section>

      <CtaBand />
    </SiteLayout>
  );
};

export default AboutPage;
