import './profile.css'
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Exit from '../assets/ExitIcon.svg' 
import LinkIcon from '../assets/LinkIcon.svg'
import DollarIcon from '../assets/DollarIcon.svg'
import TrashIcon from '../assets/TrashIcon.svg'
import IconAvatar from '../assets/IconAvatar.svg'

type EditUser = {
    avatar: string;
    name: string;
    firstName: string;
    lastName: string;
    city: string;
    country: string;
    bio: string; 
};

export type ProfileData = {
    displayName: string;
    firstName: string;
    lastName: string;
    city: string;
    country: string;
    bio: string;
    avatarFile: File | null;
    avatarPreviewUrl: string;
    linkUrl: string;
    linkLabel: string;
    supportLink: string;
};

type EditProfileProps = {
    user: EditUser;
    onClose: () => void;
    onSave: (data: ProfileData) => void;
};

const InfoIconSvg = () => (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6.5" stroke="#72DEEF" strokeWidth="1.5" />
        <path d="M8 7.5V11" stroke="#72DEEF" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="5" r="0.8" fill="#72DEEF" />
    </svg>
);

const CameraIconSvg = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19 7H16L14.5 5H9.5L8 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const UserBadgeIconSvg = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 21C20 18.2386 16.4183 16 12 16C7.58172 16 4 18.2386 4 21" stroke="#72DEEF" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="8" r="4" stroke="#72DEEF" strokeWidth="2"/>
    </svg>
);

export const EditProfile = ({ user, onClose, onSave }: EditProfileProps) => {
    const { t } = useTranslation();
    const [displayName, setDisplayName] = useState(user.name);
    const [firstName, setFirstName] = useState(user.firstName);
    const [lastName, setLastName] = useState(user.lastName);
    const [city, setCity] = useState(user.city);
    const [country, setCountry] = useState(user.country);
    const [bio, setBio] = useState(user.bio);

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(user.avatar);
    const [avatarError, setAvatarError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setAvatarError(false);
    }, [avatarPreviewUrl]);

    const [LinkTipOpen, setLinkTipOpen] = useState(false);
    const linkTipRef = useRef<HTMLDivElement>(null);

    const [LinkRowOpen, setLinkRowOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkLabel, setLinkLabel] = useState('');

    const [SupportRowOpen, setSupportRowOpen] = useState(false);
    const [supportLink, setSupportLink] = useState('');

    useEffect(() => {
        if (!LinkTipOpen) return;

        const handleOutsideClick = (e: MouseEvent) => {
            if (linkTipRef.current && !linkTipRef.current.contains(e.target as Node)) {
                setLinkTipOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [LinkTipOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAvatarFile(file);
        setAvatarPreviewUrl(URL.createObjectURL(file));
    };

    const handleRemoveLinkRow = () => {
        setLinkUrl('');
        setLinkLabel('');
        setLinkRowOpen(false);
    };

    const handleRemoveSupportRow = () => {
        setSupportLink('');
        setSupportRowOpen(false);
    };

    const handleRemovePhoto = () => {
        setAvatarFile(null);
        setAvatarPreviewUrl('');
        setAvatarError(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const isDirty =
        displayName !== user.name ||
        firstName !== user.firstName ||
        lastName !== user.lastName ||
        city !== user.city ||
        country !== user.country ||
        bio !== user.bio ||
        avatarFile !== null ||
        avatarPreviewUrl !== user.avatar ||
        linkUrl !== '' ||
        linkLabel !== '' ||
        supportLink !== ''; 

    const handleSave = () => {
        if (!isDirty) return;
        onSave({ displayName, firstName, lastName, city, country, bio, avatarFile, avatarPreviewUrl, linkUrl, linkLabel, supportLink });
    };

    return createPortal(
        <div className="EditProfile" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="EditProfileModal">
                <div className="EditProfileHeader">
                    <div className="EditProfileTitleGroup">
                        <div className="EditProfileIconBadge">
                            <UserBadgeIconSvg />
                        </div>
                        <span className="EditProfileTitle">{t('editprofile.title', 'Редагувати профіль')}</span>
                    </div>
                    <button className="EditProfileClose" onClick={onClose} aria-label="Close">
                        <img src={Exit} className="EditProfileCloseIcon" alt="Close" />
                    </button>
                </div>

                <div className="EditProfileBody">
                    <div className="EditProfileTopSection">
                        <div className="EditProfileAvatarCol">
                            <div 
                                className="EditProfileAvatar"
                                onClick={() => fileInputRef.current?.click()}
                                title={t('editprofile.change_photo', 'Змінити фото')}
                            >
                                {avatarPreviewUrl && !avatarError ? (
                                    <img src={avatarPreviewUrl} className="EditProfileAvatarImg" onError={() => setAvatarError(true)} alt="Avatar" />
                                ) : (
                                    <img src={IconAvatar} className="EditProfileAvatarImg default-avatar" alt="Default Avatar" />
                                )}
                                <div className="EditProfileAvatarOverlay">
                                    <CameraIconSvg />
                                </div>
                            </div>

                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                            <div className="EditProfileAvatarBtns">
                                <button className="ChangePhotoBtn" onClick={() => fileInputRef.current?.click()}>
                                    {t('editprofile.change_photo', 'Змінити фото')}
                                </button>
                                {avatarPreviewUrl ? (
                                    <button className="RemovePhotoBtn" onClick={handleRemovePhoto}>
                                        {t('editprofile.remove_photo', 'Видалити фото')}
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        <div className="EditProfileFormCol">
                            <div className="EditProfileField EditProfileFieldFull">
                                <span className="EditProfileName">{t('editprofile.display_name', "Відображуване ім'я*")}</span>
                                <input id="edit-display-name" name="displayName" className="EditName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                            </div>

                            <div className="EditProfileFieldRow">
                                <div className="EditProfileField">
                                    <span className="EditProfileFirstName">{t('editprofile.first_name', "Ім'я")}</span>
                                    <input id="edit-first-name" name="firstName" className="EditFirstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                                </div>
                                <div className="EditProfileField">
                                    <span className="EditProfileLastName">{t('editprofile.last_name', 'Прізвище')}</span>
                                    <input id="edit-last-name" name="lastName" className="EditLastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                                </div>
                            </div>

                            <div className="EditProfileFieldRow">
                                <div className="EditProfileField">
                                    <span className="EditProfileCity">{t('editprofile.city', 'Місто')}</span>
                                    <input id="edit-city" name="city" className="EditCity" value={city} onChange={(e) => setCity(e.target.value)} />
                                </div>
                                <div className="EditProfileField">
                                    <span className="EditProfileCountry">{t('editprofile.country', 'Країна')}</span>
                                    <input id="edit-country" name="country" className="EditCountry" value={country} onChange={(e) => setCountry(e.target.value)} />
                                </div>
                            </div>

                            <div className="EditProfileField EditProfileFieldFull">
                                <span className="EditProfileBio">{t('editprofile.bio', 'Про себе')}</span>
                                <div className="EditProfileTextareaWrap">
                                    <textarea id="edit-bio" name="bio" className="EditProfileTextarea" value={bio} onChange={(e) => setBio(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="EditProfileLinksSection">
                        <div className="EditProfileLinkTitleRow" ref={linkTipRef}>
                            <span className="EditProfileLinkTitle">{t('editprofile.links_title', 'Ваші посилання')}</span>
                            <button className="EditProfileBadgeBtn" onClick={() => setLinkTipOpen((prev) => !prev)} title="Info">
                                <InfoIconSvg />
                            </button>

                            {LinkTipOpen && (
                                <div className="EditProfileTooltip">
                                    {t('editprofile.tooltip', 'Додайте посилання на свій вебсайт і профілі в соціальних мережах, щоб ваша аудиторія могла легко знайти вас на будь-якій платформі.')}
                                </div>
                            )}
                        </div>

                        {LinkRowOpen && (
                            <div className="EditProfWebLink">
                                <div className="EditProfWebLinkInput">
                                    <img src={LinkIcon} className="EditProfWebLinkIcon" alt="Link" />
                                    <input id="edit-link-url" name="linkUrl" className="EditProfWebLinkInputField" placeholder={t('editprofile.link_placeholder', 'Вебсайт або електронна пошта')} value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
                                </div>
                                <input id="edit-link-label" name="linkLabel" className="EditProfWebLinkName" placeholder={t('editprofile.link_name_placeholder', 'Коротка назва')} value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
                                <button className="EditProfWebLinkDeleteBtn" onClick={handleRemoveLinkRow}>
                                    <img src={TrashIcon} className="EditProfWebLinkDeleteIcon" alt="Delete" />
                                </button>
                            </div>
                        )}

                        {SupportRowOpen && (
                            <>
                                <div className="EditProfPaypalLink">
                                    <div className="EditProfWebLinkInput EditProfPaypalLinkInput">
                                        <img src={DollarIcon} className="EditProfWebLinkIcon" alt="Support" />
                                        <input id="edit-support-link" name="supportLink" className="EditProfPaypalLinkInputField" placeholder={t('editprofile.support_placeholder', 'paypal.me/username')} value={supportLink} onChange={(e) => setSupportLink(e.target.value)} />
                                    </div>
                                    <button className="EditProfPaypalDeleteBtn" onClick={handleRemoveSupportRow}>
                                        <img src={TrashIcon} className="EditProfPaypalDeleteIcon" alt="Delete" />
                                    </button>
                                </div>
                                <p className="EditProfPaypalHint">{t('editprofile.support_hint', 'Підтримувані платформи: PayPal, Cash App, Venmo, Bandcamp, Shopify, Kickstarter, Patreon та GoFundMe.')}</p>
                            </>
                        )}

                        <div className="EditProfileAddBtnsRow">
                            {!LinkRowOpen && (
                                <button className="EditProfileAddBtn" onClick={() => setLinkRowOpen(true)}>
                                    <span className="EditProfileAddBtnPlus">+</span> {t('editprofile.add_link', 'Додати посилання')}
                                </button>
                            )}
                            {!SupportRowOpen && (
                                <button className="EditProfileSupportBtn" onClick={() => setSupportRowOpen(true)}>
                                    <span className="EditProfileAddBtnPlus">+</span> {t('editprofile.add_support', 'Додати посилання підтримки')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="EditProfileBottomBtnsRow">
                    <button className="EditProfileCancelBtn" onClick={onClose}>{t('editprofile.cancel', 'Скасувати')}</button>
                    <button
                        className={`EditProfileSaveBtn ${isDirty ? 'active' : ''}`}
                        onClick={handleSave}
                        disabled={!isDirty}
                    >
                        {t('editprofile.save', 'Зберегти зміни')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditProfile;