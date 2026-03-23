import React from 'react';
import { Composition } from 'remotion';
import { BrandMonkzVideo } from './BrandMonkzVideo';
import { CampaignTutorialVideo } from './scenes/CampaignTutorialScenes';

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
  </>
);
