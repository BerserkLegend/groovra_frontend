import React, { createContext, useContext } from 'react'

export interface ProfileContextType {
    profileName: string
    systemUsername: string
    avatarUrl: string | null
    bannerUrl: string | null
    isLoadingProfile: boolean
    setProfileName: (name: string) => void
    setAvatarUrl: (url: string) => void
    setBannerUrl: (url: string) => void
    profileData: {
        firstName: string
        lastName: string
        bio: string
        city: string
        country: string
        phone: string
        birthday: string
        gender: string
        linkUrl: string
        linkLabel: string
        supportLink: string
        createdAt: string
    }
    setProfileData: React.Dispatch<React.SetStateAction<ProfileContextType['profileData']>>
    refreshProfile: () => Promise<void>
}

export const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export const useProfile = () => {
    const context = useContext(ProfileContext)
    if (!context) {
        throw new Error('useProfile must be used within a ProfileProvider')
    }
    return context
}
