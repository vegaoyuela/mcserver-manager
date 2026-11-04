import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { BedrockProcessService } from '../services/bedrock-process.service';
import { BedrockPropertiesService } from '../services/bedrock-properties.service';
import { BedrockVersionsService } from '../services/bedrock-versions.service';
import { BedrockPacksService } from '../services/bedrock-packs.service';

const router = Router();
const bedrockProcessService = BedrockProcessService.getInstance();
const bedrockPropertiesService = BedrockPropertiesService.getInstance();
const bedrockVersionsService = BedrockVersionsService.getInstance();
const bedrockPacksService = BedrockPacksService.getInstance();

const packUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.mcpack', '.mcaddon', '.rp', '.bp', '.zip'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no compatible. Sube archivos .mcpack, .mcaddon, .rp, .bp o .zip'));
    }
  },
});

// Status endpoint
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await bedrockProcessService.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al obtener estado de Bedrock' });
  }
});

// Process control action (start, stop, restart)
router.post('/action', async (req: Request, res: Response) => {
  const { action } = req.body;
  if (!['start', 'stop', 'restart'].includes(action)) {
    return res.status(400).json({ error: 'Acción inválida. Usa start, stop o restart.' });
  }

  try {
    let result: { success: boolean; message: string };
    if (action === 'start') {
      result = await bedrockProcessService.start();
    } else if (action === 'stop') {
      result = await bedrockProcessService.stop();
    } else {
      result = await bedrockProcessService.restart();
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Console command execution
router.post('/command', (req: Request, res: Response) => {
  const { command } = req.body;
  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Comando requerido' });
  }

  const success = bedrockProcessService.sendCommand(command);
  if (!success) {
    return res.status(400).json({
      success: false,
      message: 'El servidor Bedrock no está en ejecución o no acepta comandos.',
    });
  }
  res.json({ success: true, message: `Comando '${command}' enviado a Bedrock` });
});

// Properties read
router.get('/properties', (_req: Request, res: Response) => {
  try {
    const data = bedrockPropertiesService.readProperties();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al leer server.properties de Bedrock' });
  }
});

// Properties update
router.put('/properties', (req: Request, res: Response) => {
  try {
    const { properties } = req.body;
    if (!properties || typeof properties !== 'object') {
      return res.status(400).json({ error: 'Objeto de propiedades requerido' });
    }
    bedrockPropertiesService.writeProperties(properties);
    res.json({ success: true, message: 'Propiedades de Bedrock guardadas correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al guardar server.properties de Bedrock' });
  }
});

// Version metadata
router.get('/versions', async (_req: Request, res: Response) => {
  try {
    const installed = bedrockVersionsService.getInstalledInfo();
    const available = await bedrockVersionsService.getAvailableVersion();
    res.json({ installed, available });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al consultar versiones de Bedrock' });
  }
});

// Version install / update
router.post('/install', async (req: Request, res: Response) => {
  const { downloadUrl } = req.body || {};
  try {
    const result = await bedrockVersionsService.install(downloadUrl);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error durante la instalación de Bedrock' });
  }
});

// Pack & Add-on routes (RP, BP, MCPACK, MCADDON)
router.get('/packs', (_req: Request, res: Response) => {
  try {
    const data = bedrockPacksService.getPacks();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al listar packs de Bedrock' });
  }
});

// Upload packs (supports single file or multiple files)
router.post('/packs/upload', packUpload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No se recibieron archivos de packs para subir.' });
    }

    const installedAll: string[] = [];
    for (const f of files) {
      const resInstall = await bedrockPacksService.installPackFromBuffer(f.buffer, f.originalname);
      installedAll.push(...resInstall.installedPacks);
    }

    res.json({
      success: true,
      installedPacks: installedAll,
      message: `¡${installedAll.length} pack(s) instalado(s) con éxito en Bedrock!`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Error al procesar packs de Bedrock' });
  }
});

// Toggle pack in active world (world_resource_packs.json / world_behavior_packs.json)
router.put('/packs/:type/:uuid/toggle', (req: Request, res: Response) => {
  const { type, uuid } = req.params;
  const { enable } = req.body;
  if (type !== 'resource' && type !== 'behavior') {
    return res.status(400).json({ error: 'Tipo de pack inválido. Usa resource o behavior.' });
  }

  try {
    const result = bedrockPacksService.togglePack(uuid, type, Boolean(enable));
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al alternar pack' });
  }
});

// Delete pack
router.delete('/packs/:type/:folderName', (req: Request, res: Response) => {
  const { type, folderName } = req.params;
  if (type !== 'resource' && type !== 'behavior') {
    return res.status(400).json({ error: 'Tipo de pack inválido. Usa resource o behavior.' });
  }

  try {
    const result = bedrockPacksService.deletePack(type, folderName);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al eliminar pack' });
  }
});

export default router;
