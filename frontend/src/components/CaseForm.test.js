import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import CaseForm from './CaseForm.vue';

const { push, createCaseWithSync } = vi.hoisted(() => ({
  push: vi.fn(),
  createCaseWithSync: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('../services/caseService', () => ({
  createCaseWithSync,
}));

describe('CaseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders form fields', () => {
    const wrapper = mount(CaseForm);
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.findAll('select')).toHaveLength(2);
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(true);
  });

  it('submits case successfully', async () => {
    createCaseWithSync.mockResolvedValue({ id: '1' });

    const wrapper = mount(CaseForm);
    await wrapper.find('input[placeholder="e.g., Defective Electronic Hardware"]').setValue('Test Title');
    await wrapper.find('input[placeholder="Company Name"]').setValue('Test Company');
    await wrapper.find('textarea').setValue('Test Description');
    await wrapper.find('#disclaimer-consent').setValue(true);

    await wrapper.find('form').trigger('submit.prevent');
    await Promise.resolve();
    await nextTick();

    expect(createCaseWithSync).toHaveBeenCalledWith({
      title: 'Test Title',
      description: 'Test Description',
      company: 'Test Company',
      category: 'Other',
      jurisdiction: 'District',
      file: null,
    });

    expect(wrapper.text()).toContain('Grievance logged in local engine');

    await vi.runAllTimersAsync();
    expect(push).toHaveBeenCalledWith('/cases');
  });

  it('shows an error hint when submission fails', async () => {
    createCaseWithSync.mockRejectedValue(new Error('Submission failed'));

    const wrapper = mount(CaseForm);
    await wrapper.find('input[placeholder="e.g., Defective Electronic Hardware"]').setValue('Test Title');
    await wrapper.find('input[placeholder="Company Name"]').setValue('Test Company');
    await wrapper.find('textarea').setValue('Test Description');
    await wrapper.find('#disclaimer-consent').setValue(true);
    await wrapper.find('form').trigger('submit.prevent');
    await Promise.resolve();
    await nextTick();

    expect(wrapper.text()).toContain('Execution failure');
    expect(push).not.toHaveBeenCalled();
  });
});
