import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CaseForm from './CaseForm.vue';

// Mock the API
vi.mock('../services/api', () => ({
  createCase: vi.fn(),
}));

vi.mock('../services/ai', () => ({
  classifyCase: vi.fn(),
}));

import { createCase } from '../services/api';
import { classifyCase } from '../services/ai';

describe('CaseForm', () => {
  it('renders form fields', () => {
    const wrapper = mount(CaseForm);
    expect(wrapper.find('input[required]').exists()).toBe(true);
    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.find('select').exists()).toBe(true);
  });

  it('submits case successfully', async () => {
    createCase.mockResolvedValue({ id: '1' });

    const wrapper = mount(CaseForm);
    await wrapper.find('input[required]').setValue('Test Title');
    await wrapper.find('textarea').setValue('Test Description');
    await wrapper.find('input[type="text"]').setValue('Test Company');

    await wrapper.find('form').trigger('submit.prevent');

    expect(createCase).toHaveBeenCalledWith({
      title: 'Test Title',
      description: 'Test Description',
      company: 'Test Company',
      category: 'Telecom',
      jurisdiction: 'District',
      file: null,
    });
  });

  it('classifies case with AI', async () => {
    classifyCase.mockResolvedValue({
      category: 'Banking',
      severity: 'High',
      suggestion: 'File with RBI',
    });

    const wrapper = mount(CaseForm);
    await wrapper.find('textarea').setValue('Bank issue');
    await wrapper.find('button').trigger('click');

    expect(classifyCase).toHaveBeenCalledWith('Bank issue');
  });
});
