import { Router } from 'express';
import { MemoryService } from '../services/memory/MemoryService';
import { MemorySection, memorySections } from '../config/memorySections';

const router = Router();
const memoryService = new MemoryService();

// GET /memory/:projectId/:section - Read a memory section
router.get('/memory/:projectId/:section', async (req, res, next) => {
  try {
    const { projectId, section } = req.params;
    
    if (!memorySections.includes(section as MemorySection)) {
      return res.status(404).json({ error: `Unknown section: ${section}` });
    }

    const content = await memoryService.readSection(projectId, section as MemorySection);
    res.json({ section, content });
  } catch (err) {
    next(err);
  }
});

// GET /memory/:projectId - List all sections and their contents
router.get('/memory/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const sections = await memoryService.listSections(projectId);
    const contents = await Promise.all(
      sections.map(async section => ({
        section,
        content: await memoryService.readSection(projectId, section)
      }))
    );
    
    res.json({ projectId, sections: contents });
  } catch (err) {
    next(err);
  }
});

// POST /memory/:projectId/:section - Append to a memory section
router.post('/memory/:projectId/:section', async (req, res, next) => {
  try {
    const { projectId, section } = req.params;
    const { entry } = req.body;

    if (!entry) {
      return res.status(400).json({ error: 'Entry content is required' });
    }

    if (!memorySections.includes(section as MemorySection)) {
      return res.status(404).json({ error: `Unknown section: ${section}` });
    }

    await memoryService.appendToSection(projectId, section as MemorySection, entry);
    const content = await memoryService.readSection(projectId, section as MemorySection);
    
    res.json({ section, content });
  } catch (err) {
    next(err);
  }
});

export default router;
