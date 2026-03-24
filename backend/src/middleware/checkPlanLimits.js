const pool = require('../config/db');

const checkPlanLimits = async (req, res, next) => {
  const userId = req.user.id;

  try {
    // 1. Obtenir info de l'usuari i els seus límits
    const userRes = await pool.query(
      'SELECT plan, ai_uses_this_month, ai_uses_reset_at FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuari no trobat' });
    }

    let { plan, ai_uses_this_month, ai_uses_reset_at } = userRes.rows[0];
    const now = new Date();

    // 2. Comprovar si cal resetejar el comptador mensual
    if (new Date(ai_uses_reset_at) <= now) {
      const nextReset = new Date();
      nextReset.setMonth(nextReset.getMonth() + 1);

      await pool.query(
        'UPDATE users SET ai_uses_this_month = 0, ai_uses_reset_at = $1 WHERE id = $2',
        [nextReset, userId]
      );
      ai_uses_this_month = 0;
    }

    // 3. Validar límits segons el pla
    if (plan === 'free') {
      return res.status(403).json({
        error: 'Actualitza el pla per usar la IA',
        upgrade_url: '/plans'
      });
    }

    if (plan === 'pro' && ai_uses_this_month >= 50) {
      return res.status(403).json({
        error: 'Has arribat al límit de 50 usos mensuals del pla Pro.',
        upgrade_url: '/plans'
      });
    }

    // Si passa els filtres (pro < 50 o premium), continuem
    // Incrementarem el comptador al final de la petició exitosa
    // o podem fer-ho aquí depenent de la política de l'empresa (aquí és més segur per evitar abusos)
    
    // Guardem info al req per si el controller la necessita
    req.userPlan = plan;

    next();
  } catch (err) {
    console.error('Error in checkPlanLimits:', err);
    res.status(500).json({ error: 'Error intern del servidor' });
  }
};

// Middleware per incrementar el comptador DESPRÉS de l'ús exitós
const incrementAiUsage = async (req, res, next) => {
  const userId = req.user.id;
  try {
    await pool.query(
      'UPDATE users SET ai_uses_this_month = ai_uses_this_month + 1 WHERE id = $1',
      [userId]
    );
    if (next) next();
  } catch (err) {
    console.error('Error incrementing AI usage:', err);
  }
};

module.exports = { checkPlanLimits, incrementAiUsage };
