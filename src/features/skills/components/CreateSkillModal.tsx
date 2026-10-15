import { useState } from 'react';
import { Button, Field, Input, Modal, Textarea } from '@/components/ui';
import { useT } from '@/i18n';
import { createSkill } from '../api';
import { DESCRIPTION_MAX, NAME_MAX, validateDescription, validateName } from '../frontmatter';
import type { Skill } from '../types';
import s from './parts.module.css';

/** 新建 Skill：填写 name 与 description，实时校验，创建后进入详情编辑 */
export function CreateSkillModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (skill: Skill) => void;
}) {
  const t = useT();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [touched, setTouched] = useState({ name: false, desc: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nameIssues = validateName(name);
  const descIssues = validateDescription(desc);
  const valid = nameIssues.length === 0 && descIssues.length === 0;

  function reset() {
    setName('');
    setDesc('');
    setTouched({ name: false, desc: false });
    setErr(null);
  }
  function close() {
    if (busy) return;
    reset();
    onClose();
  }

  async function submit(e?: { preventDefault: () => void }) {
    e?.preventDefault();
    setTouched({ name: true, desc: true });
    if (!valid || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const skill = await createSkill(name.trim(), desc.trim());
      reset();
      onCreated(skill);
    } catch (x) {
      setErr(x instanceof Error ? x.message : String(x));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('新建 Skill')}
      width={560}
      footer={
        <>
          <Button onClick={close} disabled={busy}>
            {t('取消')}
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy || !valid}>
            {busy ? t('创建中…') : t('创建并编辑')}
          </Button>
        </>
      }
    >
      <form className={s.form} onSubmit={(e) => void submit(e)}>
        <Field
          label={t('名称（name）')}
          hint={t('小写字母、数字和连字符，例如 invoice-ocr-review；创建后不可修改')}
          error={touched.name && nameIssues[0] ? t(nameIssues[0].message) : undefined}
        >
          {(id) => (
            <div className={s.counterWrap}>
              <Input
                id={id}
                className="mono"
                value={name}
                autoFocus
                spellCheck={false}
                autoComplete="off"
                placeholder="invoice-ocr-review"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit(e);
                }}
                invalid={touched.name && nameIssues.length > 0}
                onChange={(e) => {
                  setName(e.target.value);
                  setTouched((x) => ({ ...x, name: true }));
                }}
              />
              <span className={s.counter} data-over={name.length > NAME_MAX || undefined}>
                {name.length} / {NAME_MAX}
              </span>
            </div>
          )}
        </Field>
        <Field
          label={t('描述（description）')}
          hint={t('说明这个 Skill 做什么、何时使用；agent 据此决定是否加载。不能包含尖括号')}
          error={touched.desc && descIssues[0] ? t(descIssues[0].message) : undefined}
        >
          {(id) => (
            <div className={s.counterWrap}>
              <Textarea
                id={id}
                rows={4}
                value={desc}
                invalid={touched.desc && descIssues.length > 0}
                onChange={(e) => {
                  setDesc(e.target.value);
                  setTouched((x) => ({ ...x, desc: true }));
                }}
              />
              <span className={s.counter} data-over={desc.length > DESCRIPTION_MAX || undefined}>
                {desc.length} / {DESCRIPTION_MAX}
              </span>
            </div>
          )}
        </Field>
        <div className={s.note}>{t('创建后生成草稿版本 0.1.0-draft.1，不会下发到任何 agent；绑定关系在统一 agent 平台中配置。')}</div>
        {err ? (
          <div className={s.formError} role="alert">
            {t(err)}
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
