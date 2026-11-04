import path from 'path';

export const DEFAULT_SERVER_ROOT = process.env.SERVER_ROOT || '/data';
export const DEFAULT_FILE_EXPLORER_ROOT = '/data';
export const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);
export const PANEL_CONFIG_FILE = process.env.PANEL_CONFIG_PATH || path.join(process.cwd(), 'panel-config.json');

export const SUBDIRS = {
  SERVER: 'server',
  MODS: path.join('server', 'mods'),
  LOGS: path.join('server', 'logs'),
  LATEST_LOG: path.join('server', 'logs', 'latest.log'),
  PROPERTIES: path.join('server', 'server.properties'),
  OPS: path.join('server', 'ops.json'),
  WHITELIST: path.join('server', 'whitelist.json'),
  BANNED_PLAYERS: path.join('server', 'banned-players.json'),
  BANNED_IPS: path.join('server', 'banned-ips.json'),
  EULA: path.join('server', 'eula.txt'),
  PLAYIT: 'playit',
  SCRIPTS: 'scripts',
  START_SCRIPT: path.join('scripts', 'start.sh'),
  BEDROCK: 'bedrock',
  BEDROCK_SERVER: path.join('bedrock', 'bedrock_server'),
  BEDROCK_PROPERTIES: path.join('bedrock', 'server.properties'),
  BEDROCK_PERMISSIONS: path.join('bedrock', 'permissions.json'),
  BEDROCK_ALLOWLIST: path.join('bedrock', 'allowlist.json'),
  BEDROCK_LOGS: path.join('bedrock', 'logs'),
  BEDROCK_LATEST_LOG: path.join('bedrock', 'logs', 'latest.log'),
};
