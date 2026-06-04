import { DataSource } from 'typeorm';

/**
 * Seed data for development and initial production setup.
 * Run: npx ts-node database/seeds/seed.ts
 */
export async function seed(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // ── Seed admin & compliance users ──────────────────────────────────
    await queryRunner.query(`
      INSERT INTO users (id, mobile_number, role, status, locale)
      VALUES
        ('00000000-0000-0000-0000-000000000001', '+919900000001', 'admin', 'active', 'en'),
        ('00000000-0000-0000-0000-000000000002', '+919900000002', 'compliance', 'active', 'en')
      ON CONFLICT DO NOTHING;
    `);

    // ── Seed loan products ────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO cms_loan_products
        (product_code, name_json, description_json,
         min_amount, max_amount, min_tenure_months, max_tenure_months,
         interest_rate_min, interest_rate_max, eligible_risk_bands, min_score)
      VALUES
        ('MSME_WORKING_CAPITAL',
         '{"en":"MSME Working Capital Loan","hi":"MSME कार्यशील पूंजी ऋण"}',
         '{"en":"Short-term working capital for small businesses"}',
         1000000, 10000000, 6, 36, 12.0, 24.0,
         ARRAY['low','medium','very_low']::risk_band[], 600),
        ('PERSONAL_EMERGENCY',
         '{"en":"Personal Emergency Loan","hi":"व्यक्तिगत आपातकालीन ऋण"}',
         '{"en":"Quick personal loan for emergencies"}',
         100000, 500000, 3, 24, 18.0, 30.0,
         ARRAY['medium','low','very_low']::risk_band[], 550),
        ('AGRICULTURE_LOAN',
         '{"en":"Agriculture Loan","hi":"कृषि ऋण"}',
         '{"en":"Seasonal crop and equipment financing for farmers"}',
         50000, 5000000, 3, 36, 10.0, 20.0,
         ARRAY['low','medium','high','very_low']::risk_band[], 500),
        ('EDUCATION_LOAN',
         '{"en":"Education Loan","hi":"शिक्षा ऋण"}',
         '{"en":"Skill development and education financing"}',
         50000, 2000000, 6, 48, 14.0, 22.0,
         ARRAY['low','medium','very_low']::risk_band[], 550)
      ON CONFLICT DO NOTHING;
    `);

    // ── Seed psychometric questionnaire v3 ────────────────────────────
    await queryRunner.query(`
      INSERT INTO cms_questionnaire_questions
        (version, q_number, group_name, question_json, options_json, scoring_rule)
      VALUES
        ('v3', 1, 'risk_tolerance',
         '{"en":"If you won ₹10,000 today, what would you do?",
           "hi":"यदि आपको आज ₹10,000 मिलें, तो आप क्या करेंगे?",
           "ta":"இன்று ₹10,000 கிடைத்தால் என்ன செய்வீர்கள்?"}',
         '[{"value":1,"labels":{"en":"Spend it all","hi":"सब खर्च करें"}},
           {"value":2,"labels":{"en":"Spend half","hi":"आधा खर्च करें"}},
           {"value":3,"labels":{"en":"Save most","hi":"ज्यादातर बचाएं"}},
           {"value":4,"labels":{"en":"Invest all","hi":"सब निवेश करें"}}]',
         '{"type":"linear","min_score":0,"max_score":1,"mapping":{"1":0.1,"2":0.4,"3":0.7,"4":1.0}}'),
        ('v3', 2, 'delayed_gratification',
         '{"en":"Would you rather have ₹5,000 now or ₹10,000 in 3 months?",
           "hi":"क्या आप अभी ₹5,000 लेंगे या 3 महीने बाद ₹10,000?"}',
         '[{"value":1,"labels":{"en":"₹5,000 now","hi":"अभी ₹5,000"}},
           {"value":2,"labels":{"en":"Depends on situation","hi":"स्थिति पर निर्भर"}},
           {"value":3,"labels":{"en":"₹10,000 in 3 months","hi":"3 महीने बाद ₹10,000"}}]',
         '{"type":"linear","min_score":0,"max_score":1,"mapping":{"1":0.2,"2":0.5,"3":1.0}}'),
        ('v3', 3, 'financial_literacy',
         '{"en":"If you save ₹100 at 10% annual interest, how much after 1 year?",
           "hi":"यदि आप 10% वार्षिक ब्याज पर ₹100 बचाएं, 1 साल बाद कितना?"}',
         '[{"value":1,"labels":{"en":"₹100","hi":"₹100"}},
           {"value":2,"labels":{"en":"₹105","hi":"₹105"}},
           {"value":3,"labels":{"en":"₹110","hi":"₹110"}},
           {"value":4,"labels":{"en":"₹120","hi":"₹120"}}]',
         '{"type":"exact_match","correct_value":3,"correct_score":1.0,"wrong_score":0.0}'),
        ('v3', 4, 'financial_behaviour',
         '{"en":"How do you track your monthly expenses?",
           "hi":"आप अपने मासिक खर्चों पर कैसे नज़र रखते हैं?"}',
         '[{"value":1,"labels":{"en":"I do not track","hi":"मैं ट्रैक नहीं करता"}},
           {"value":2,"labels":{"en":"Mental note","hi":"मानसिक नोट"}},
           {"value":3,"labels":{"en":"Written/notebook","hi":"लिखकर/डायरी में"}},
           {"value":4,"labels":{"en":"App/software","hi":"ऐप/सॉफ्टवेयर"}}]',
         '{"type":"linear","min_score":0,"max_score":1,"mapping":{"1":0.1,"2":0.4,"3":0.7,"4":1.0}}'),
        ('v3', 5, 'risk_tolerance',
         '{"en":"Your business faces a sudden 20% revenue drop. What do you do?",
           "hi":"आपके व्यवसाय में अचानक 20% राजस्व गिरावट आती है। आप क्या करेंगे?"}',
         '[{"value":1,"labels":{"en":"Panic and consider closing","hi":"घबराएं और बंद करने पर विचार करें"}},
           {"value":2,"labels":{"en":"Cut expenses immediately","hi":"तुरंत खर्चे कम करें"}},
           {"value":3,"labels":{"en":"Use savings as buffer","hi":"बचत को बफर के रूप में उपयोग करें"}},
           {"value":4,"labels":{"en":"Diversify revenue sources","hi":"राजस्व स्रोत विविध करें"}}]',
         '{"type":"linear","min_score":0,"max_score":1,"mapping":{"1":0.1,"2":0.4,"3":0.7,"4":1.0}}')
      ON CONFLICT DO NOTHING;
    `);

    // ── Seed CMS content ──────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO cms_content (key, locale, namespace, content, is_active, published_at)
      VALUES
        ('app.tagline', 'en', 'global', '{"text":"Your Alternative Credit Score"}', true, NOW()),
        ('app.tagline', 'hi', 'global', '{"text":"आपका वैकल्पिक क्रेडिट स्कोर"}', true, NOW()),
        ('score.explanation', 'en', 'scoring', '{"text":"Your BharatScore ranges from 300-900 and reflects your financial behaviour."}', true, NOW()),
        ('score.explanation', 'hi', 'scoring', '{"text":"आपका BharatScore 300-900 के बीच है और आपके वित्तीय व्यवहार को दर्शाता है।"}', true, NOW())
      ON CONFLICT DO NOTHING;
    `);

    // ── Seed FAQs ─────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO cms_faqs (category, question, answer, locale, sort_order, tags)
      VALUES
        ('general', 'What is BharatScore?', 'BharatScore is an alternative credit scoring platform that uses non-traditional data to generate a credit score between 300-900.', 'en', 1, ARRAY['score','about']),
        ('general', 'BharatScore क्या है?', 'BharatScore एक वैकल्पिक क्रेडिट स्कोरिंग प्लेटफॉर्म है जो 300-900 के बीच क्रेडिट स्कोर जनरेट करने के लिए गैर-पारंपरिक डेटा का उपयोग करता है।', 'hi', 1, ARRAY['score','about']),
        ('privacy', 'How is my data protected?', 'All personal data is encrypted using AES-256-GCM. We comply with the DPDP Act 2023 and RBI guidelines. Your data is stored in India only.', 'en', 1, ARRAY['privacy','security','dpdp']),
        ('scoring', 'What data sources are used?', 'We use phone bill history, bank statements, e-commerce activity, geolocation patterns, merchant data, and psychometric assessments.', 'en', 1, ARRAY['scoring','data'])
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.commitTransaction();
    console.log('✅ Database seeded successfully');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    await queryRunner.release();
  }
}
