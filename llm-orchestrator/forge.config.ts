import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: './assets/icon', // Without extension, Forge adds .ico/.icns as needed
    name: 'LLM Orchestrator',
    executableName: 'llm-orchestrator',
    appBundleId: 'com.yourcompany.llm-orchestrator',
    appCopyright: 'Copyright © 2024 Your Company',
    extraResource: [
      './frameworks' // Include frameworks folder in build
    ],
  },
  rebuildConfig: {},
  makers: [
    // Windows
    new MakerSquirrel({
      name: 'LLMOrchestrator',
      authors: 'Your Company',
      description: 'LLM Orchestration Platform',
      iconUrl: 'https://raw.githubusercontent.com/yourrepo/icon.ico',
      setupIcon: './assets/icon.ico'
    }),
    
    // macOS
    new MakerZIP({}, ['darwin']),
    new MakerDMG({
      name: 'LLM Orchestrator',
      icon: './assets/icon.icns',
      background: './assets/dmg-background.png',
      contents: [
        {
          x: 130,
          y: 220,
          type: 'file',
          path: '/Applications'
        },
        {
          x: 410,
          y: 220,
          type: 'link',
          path: '/Applications'
        }
      ]
    }),
    
    // Linux
    new MakerDeb({
      options: {
        name: 'llm-orchestrator',
        productName: 'LLM Orchestrator',
        genericName: 'LLM Orchestration Platform',
        description: 'Manage and orchestrate multiple LLMs',
        categories: ['Development', 'Utility'],
        icon: './assets/icon.png',
        maintainer: 'Your Name <email@example.com>',
        homepage: 'https://yourwebsite.com'
      }
    }),
    new MakerRpm({
      options: {
        name: 'llm-orchestrator',
        productName: 'LLM Orchestrator',
        description: 'LLM Orchestration Platform',
        categories: ['Development', 'Utility'],
        icon: './assets/icon.png',
        maintainer: 'Your Name <email@example.com>',
        homepage: 'https://yourwebsite.com'
      }
    })
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'yourgithubusername',
          name: 'llm-orchestrator'
        },
        prerelease: true
      }
    }
  ],
  hooks: {
    prePackage: async () => {
      console.log('Running prePackage hook...');
      // Add any pre-build tasks here
    }
  }
};

export default config;
