import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import 'leaflet/dist/leaflet.css'
import './style.css'

import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon   from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'

import ellipse16 from './ellipse-16.svg'
import ellipse17 from './ellipse-17.svg'
import ellipse18 from './ellipse-18.svg'
import ellipse19 from './ellipse-19.svg'
import polygon5  from './polygon-5.svg'

import maskGroup  from './mask-group.png'
import image      from './image.png'
import maskGroup2 from './mask-group-2.png'
import maskGroup3 from './mask-group-3.png'

import icon     from './icon.svg'
import icon2    from './icon-2.svg'
import icon3    from './icon-3.svg'
import imageSvg from './image.svg'

export const ContainerHero: React.FC = () => {
  const { t } = useTranslation()
  return (
    <div className="container-hero">
      <div className="heading">
        <h1 className="text-wrapper">{t('about.title')}</h1>
      </div>
      <div className="groovra-is-more-than-wrapper">
        <p className="groovra-is-more-than">
          <span className="span">{t('about.groovra_is')}</span>
          <span className="text-wrapper-2">
            {t('about.groovra_desc')}
          </span>
        </p>
      </div>
      <div className="overlay-border-hero-quote">
        <p className="our-mission-is-to">
          {t('about.mission')}
        </p>
      </div>
    </div>
  )
}

export const OverlayBorderGraphic: React.FC = () => (
  <div className="overlay-border-graphic">
    <div className="frame">
      <img className="ellipse"     alt="" loading="lazy" src={ellipse16} />
      <img className="img-ellipse" alt="" loading="lazy" src={ellipse17} />
      <img className="ellipse-2"   alt="" loading="lazy" src={ellipse18} />
      <img className="ellipse-3"   alt="" loading="lazy" src={ellipse19} />
      <img className="polygon"     alt="" loading="lazy" src={polygon5}  />
    </div>
  </div>
)

export const ElementHeroSection: React.FC = () => (
  <div className="element-hero-section">
    <ContainerHero />
    <OverlayBorderGraphic />
  </div>
)

const avatars = [
  { img: maskGroup,  cls: 'mask-group',   name: 'Sova Volodymyr Y.'  },
  { img: image,      cls: 'img-team',     name: 'Subotina Maria A.'  },
  { img: maskGroup2, cls: 'mask-group-2', name: 'Didkovsky Ivan I.'  },
  { initial: 'I',                         name: 'Iordanis'           },
  { img: maskGroup3, cls: 'mask-group-3', name: 'Anichkin Oleksandr' },
  { initial: 'M',                         name: 'Khomenko Mykyta'    },
] as const

const members = [
  {
    name: 'Sova Volodymyr Yuriyovich',
    roleKey: 'about.member_roles.sova',
  },
  {
    name: 'Subotina Maria Andreevna',
    roleKey: 'about.member_roles.subotina',
  },
  {
    name: 'Didkovsky Ivan Igorovich',
    roleKey: 'about.member_roles.didkovsky',
  },
  {
    name: 'Anichkin Oleksandr',
    roleKey: 'about.member_roles.anichkin',
  },
  {
    name: 'Khomenko Mykyta',
    roleKey: 'about.member_roles.khomenko',
  },
  {
    name: 'Iordanis',
    roleKey: 'about.member_roles.iordanis',
  },
]

export const SectionCompany: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="container-team">
      <div className="div-avatars-grid">
        {avatars.map((av) => (
          <div className="div-avatar-card" key={av.name}>
            {'img' in av
              ? <img className={av.cls} alt={av.name} src={av.img} />
              : (
                <div className="overlay-border-initials">
                  <span className="text-wrapper-initial">{av.initial}</span>
                </div>
              )
            }
            <div className="text-wrapper-name">{av.name}</div>
          </div>
        ))}
      </div>

      <div className="div-info">
        <h2 className="team-heading">{t('about.team_title')}</h2>
        <div className="div-info-list">
          <p className="founded-in-by-a">
            {t('about.team_desc')}
          </p>
          <div className="member-list">
            {members.map((m) => (
              <p className="member-item" key={m.name}>
                <span className="name">{m.name}- </span>
                {t(m.roleKey)}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const stats = [
  { icon: icon,     iconCls: 'icon-users',   value: '500K+', labelKey: 'about.stats.users', fallbackLabel: 'КОРИСТУВАЧІВ' },
  { icon: imageSvg, iconCls: 'icon-tracks',  value: '50M+',  labelKey: 'about.stats.tracks', fallbackLabel: 'ТРЕКІВ' },
  { icon: icon2,    iconCls: 'icon-artists', value: '2K+',   labelKey: 'about.stats.artists', fallbackLabel: 'ВИКОНАВЦІВ' },
  { icon: icon3,    iconCls: 'icon-country', value: '25',    labelKey: 'about.stats.countries', fallbackLabel: 'КРАЇН' },
]

export const SectionStatistics: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="section-statistics">
      {stats.map((s) => (
        <div className="stat-card" key={s.labelKey}>
          <div className="stat-icon">
            <img className={s.iconCls} alt="" src={s.icon} />
          </div>
          <div className="stat-number">{s.value}</div>
          <div className="stat-label">{t(s.labelKey)}</div>
        </div>
      ))}
    </div>
  )
}

const KYIV_LAT = 50.4308
const KYIV_LNG = 30.5241

const LocationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#72DEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
)
const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#72DEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
)
const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A98FDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 11.9a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#72DEEF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

export const Label: React.FC = () => (
  <div className="label">
    <img className="image" alt="Image" loading="lazy" src={imageSvg} />
  </div>
)

export const SectionFooter: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="section-footer">
      <h2 className="section-footer-heading">
        {t('about.office_title').split(' ').slice(0, -2).join(' ')} <span className="highlight">{t('about.office_title').split(' ').slice(-2).join(' ')}</span>
      </h2>

      <div className="map-wrapper">
        <MapContainer
          center={[KYIV_LAT, KYIV_LNG]}
          zoom={14}
          scrollWheelZoom={false}
          className="leaflet-map"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[KYIV_LAT, KYIV_LNG]}>
            <Popup>
              <strong>Groovra HQ</strong><br />
              {t('about.office_address')}
            </Popup>
          </Marker>
        </MapContainer>

        <div className="glassmorphism">
          <div className="info-card">
            <p className="brand-name">Groovra</p>
            <div className="info-row">
              <LocationIcon />
              <p>{t('about.office_address')}</p>
            </div>
            <div className="info-row">
              <EmailIcon />
              <div>Groovra.music@gmail.com</div>
            </div>
            <div className="info-row">
              <PhoneIcon />
              <p>+380 44 123 45 67</p>
            </div>
            <div className="info-row">
              <ClockIcon />
              <div>{t('about.office_hours')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const AboutPage: React.FC = () => {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <main className="Main2 about-us-page">
      <div className="main-content">
        <ElementHeroSection />
        <SectionCompany />
        <SectionStatistics />
        <SectionFooter />
      </div>
    </main>
  )
}

export { AboutPage }
export default AboutPage
