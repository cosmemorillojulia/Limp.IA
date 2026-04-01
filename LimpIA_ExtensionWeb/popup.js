document.addEventListener('DOMContentLoaded', async () => {
  const toggleSwitch = document.getElementById('toggle-extension');
  const toggleText = document.getElementById('toggle-text');
  const analyzedCount = document.getElementById('analyzed-count');
  const blurredCount = document.getElementById('blurred-count');
  const protectedCount = document.getElementById('protected-count');
  const showPercentageCheckbox = document.getElementById('show-percentage');

  // Cargar estado desde storage
  const { extensionEnabled = true, analyzedCount: analyzed = 0, blurredCount: blurred = 0, protectedCount: protected = 0, showPercentage = false  } = await browser.storage.local.get();

  toggleSwitch.checked = extensionEnabled;
  analyzedCount.textContent = extensionEnabled ? analyzed : 0;
  blurredCount.textContent = extensionEnabled ? blurred : 0;
  protectedCount.textContent = extensionEnabled ? protected : 0;
  showPercentageCheckbox.checked = showPercentage;
  toggleText.textContent = extensionEnabled ? 'ON' : 'OFF';

  toggleSwitch.addEventListener('change', async () => {
    const isEnabled = toggleSwitch.checked;
    toggleText.textContent = isEnabled ? 'ON' : 'OFF';

    await browser.storage.local.set({
      extensionEnabled: isEnabled,
      analyzedCount: 0,
      blurredCount: 0,
      protectedCount: 0
    });

    analyzedCount.textContent = '0';
    blurredCount.textContent = '0';
    protectedCount.textContent = '0';

    // Enviar mensaje al content script
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      browser.tabs.sendMessage(tab.id, { action: isEnabled ? 'enable' : 'disable' });
    }
  });

  showPercentageCheckbox.addEventListener('change', async () => {
    const value = showPercentageCheckbox.checked;

    await browser.storage.local.set({
      showPercentage: value
    });

    // Enviar mensaje al content script
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      browser.tabs.sendMessage(tab.id, { action: 'setShowPercentage', showPercentage: value });
    }
  });

  browser.storage.onChanged.addListener((changes) => {
    if (changes.analyzedCount) analyzedCount.textContent = changes.analyzedCount.newValue;
    if (changes.blurredCount) blurredCount.textContent = changes.blurredCount.newValue
    if (changes.protectedCount) protectedCount.textContent = changes.protectedCount.newValue
  });
});