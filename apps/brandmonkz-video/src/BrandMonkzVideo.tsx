import React from 'react';
import { Series } from 'remotion';
import { WelcomeScene } from './scenes/WelcomeScene';
import { LoginScene } from './scenes/LoginScene';
import { ContactsScene } from './scenes/ContactsScene';
import { CampaignsScene } from './scenes/CampaignsScene';
import { ChatbotScene } from './scenes/ChatbotScene';
import { OutroScene } from './scenes/OutroScene';

export const BrandMonkzVideo: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={150}><WelcomeScene /></Series.Sequence>
    <Series.Sequence durationInFrames={150}><LoginScene /></Series.Sequence>
    <Series.Sequence durationInFrames={150}><ContactsScene /></Series.Sequence>
    <Series.Sequence durationInFrames={150}><CampaignsScene /></Series.Sequence>
    <Series.Sequence durationInFrames={150}><ChatbotScene /></Series.Sequence>
    <Series.Sequence durationInFrames={150}><OutroScene /></Series.Sequence>
  </Series>
);
