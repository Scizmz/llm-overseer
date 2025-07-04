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
    name: "LLM Orchestrator",
    executableName: "llm-orchestrator",
    // Platform-specific icons
    icon: process.platform === 'darwin' ? './assets/icon' : 
          process.platform === 'win32' ? './assets/icon.ico' : 
          './assets/icon.png',
    // App metadata
    appBundleId: 'com.abvsoftware.llm-orchestrator',
    appCategoryType: 'public.app-category.developer-tools',
    protocols: [
      {
        name: 'LLM Orchestrator Protocol',
        schemes: ['llm-orchestrator']
      }
    ],
    // macOS specific
    osxSign: {
      identity: 'Developer ID Application: Benno Wiedner',
      'hardened-runtime': true,
      'gatekeeper-assess': false,
      entitlements: './assets/entitlements.mac.plist',
      'entitlements-inherit': './assets/entitlements.mac.plist'
    },
    osxNotarize: {
      tool: 'notarytool',
      appleId: process.env.APPLE_ID || '',
      appleIdPassword: process.env.APPLE_PASSWORD || '',
      teamId: process.env.APPLE_TEAM_ID || ''
    },
    // Windows specific
    win32metadata: {
      CompanyName: 'ABV Software',
      FileDescription: 'LLM Network Orchestration Platform',
      OriginalFilename: 'llm-orchestrator.exe',
      ProductName: 'LLM Orchestrator',
      InternalName: 'llm-orchestrator'
    }
  },
  rebuildConfig: {},
  makers: [
    // Windows Installer
    new MakerSquirrel({
      name: 'llm-orchestrator',
      setupIcon: './assets/icon.ico',
      loadingGif: './assets/installer-loading.gif',
      iconUrl: 'https://raw.githubusercontent.com/Scizmz/llm-overseer/llm-orchestrator/main/assets/icon.ico',
      setupExe: 'LLM-Orchestrator-Setup.exe',
      authors: 'ABV Software',
      description: 'Advanced LLM Network Orchestration Platform'
    }),
    
    // macOS DMG
    new MakerDMG({
      name: 'LLM-Orchestrator',
      icon: './assets/icon.icns',
      background: './assets/dmg-background.png',
      format: 'ULFO',
      window: {
        size: {
          width: 660,
          height: 420
        }
      },
      contents: [
        {
          x: 180,
          y: 170,
          type: 'file',
          path: './out/LLM Orchestrator-darwin-universal/LLM Orchestrator.app'
        },
        {
          x: 480,
          y: 170,
          type: 'link',
          path: '/Applications'
        }
      ]
    }),
    
    // Cross-platform ZIP
    new MakerZIP({}, ['darwin', 'linux']),
    
    // Linux DEB package
    new MakerDeb({
      options: {
        name: 'llm-orchestrator',
        productName: 'LLM Orchestrator',
        genericName: 'LLM Network Orchestrator',
        description: 'Advanced LLM Network Orchestration Platform for managing and coordinating multiple AI language models',
        categories: ['Development', 'Network', 'Utility'],
        maintainer: 'ABVSoftware <benno@abvsoftware.com>',
        homepage: 'https://www.abvsoftware.com/llm-orchestrator',
        icon: './assets/icon.png',
        section: 'devel',
        priority: 'optional',
        depends: ['libgtk-3-0', 'libnotify4', 'libnss3', 'libxss1', 'libxtst6', 'xdg-utils', 'libatspi2.0-0', 'libdrm2', 'libxcomposite1', 'libxdamage1', 'libxrandr2', 'libgbm1', 'libxkbcommon0', 'libasound2']
      }
    }),
    
    // Linux RPM package
    new MakerRpm({
      options: {
        name: 'llm-orchestrator',
        productName: 'LLM Orchestrator',
        description: 'Advanced LLM Network Orchestration Platform',
        categories: ['Development', 'Network'],
        maintainer: 'ABVSoftware <Benno@abvsoftware.com>',
        homepage: 'https://www.abvsoftware.com/llm-orchestrator',
        icon: './assets/icon.png',
        license: ''
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
    
    // Security fuses
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
  
  // GitHub publishing configuration
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'Scizmz',
          name: 'llm-orchestrator'
        },
        prerelease: false,
        draft: true,
        generateReleaseNotes: true
      }
    }
  ],
  
  // Build hooks
  hooks: {
    prePackage: async (forgeConfig, platform, arch) => {
      console.log(`🔧 Pre-packaging for ${platform}-${arch}...`);
      
      // Platform-specific pre-build tasks
      if (platform === 'darwin') {
        console.log('🍎 Preparing macOS build...');
        // macOS specific preparations
      } else if (platform === 'win32') {
        console.log('🪟 Preparing Windows build...');
        // Windows specific preparations
      } else if (platform === 'linux') {
        console.log('🐧 Preparing Linux build...');
        // Linux specific preparations
      }
    },
    
    postPackage: async (forgeConfig, options) => {
      console.log(`✅ Post-packaging completed for ${options.platform}-${options.arch}`);
      
      // Post-packaging tasks like code signing verification
      if (options.platform === 'darwin') {
        console.log('🔐 Verifying macOS code signing...');
      }
    },
    
    preMake: async (forgeConfig, platform, arch) => {
      console.log(`🏗️ Pre-make for ${platform}-${arch}...`);
    },
    
    postMake: async (forgeConfig, makeResults) => {
      console.log('📦 Make process completed!');
      makeResults.forEach(result => {
        console.log(`✨ Created: ${result.artifacts.join(', ')}`);
      });
    }
  }
};

export default config;
