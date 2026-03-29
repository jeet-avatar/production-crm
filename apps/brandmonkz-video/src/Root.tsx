import React from 'react';
import { Composition } from 'remotion';
import { BrandMonkzVideo } from './BrandMonkzVideo';
import { CampaignTutorialVideo } from './scenes/CampaignTutorialScenes';
import { EmailSetupVideo } from './scenes/EmailSetupScenes';
import { EmailTemplateVideo } from './scenes/EmailTemplateScenes';
import { TeamEmailVideo } from './scenes/TeamEmailScenes';
import { ITSetupVideo } from './scenes/ITSetupScenes';

export const Root: React.FC = () => (
  <>
    <Composition
      id="BrandMonkzExplainer"
      component={BrandMonkzVideo}
      durationInFrames={900}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{}}
    />
    <Composition
      id="CampaignTutorial"
      component={CampaignTutorialVideo}
      durationInFrames={1200}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{}}
    />
    <Composition
      id="EmailSetup"
      component={EmailSetupVideo}
      durationInFrames={1200}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{}}
    />
    <Composition
      id="EmailTemplate"
      component={EmailTemplateVideo}
      durationInFrames={1200}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{}}
    />
    <Composition
      id="TeamEmailSetup"
      component={TeamEmailVideo}
      durationInFrames={1200}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{}}
    />
    <Composition
      id="ITSetup"
      component={ITSetupVideo}
      durationInFrames={1200}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{}}
    />
  </>
);
