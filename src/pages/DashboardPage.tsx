useEffect(() => {
  if (!projectId) return;

  let timer: number | undefined;

  const update = async () => {
    try {
      const next = await getAnalysisStatus(projectId);

      setStatus({
        progress: next.progress ?? 0,
        status: next.status ?? 'Processing...'
      });

      // ✅ only stop when truly complete
      if ((next.progress ?? 0) >= 100) {
        setPolling(false);
        if (timer) clearInterval(timer);
      }
    } catch (err) {
      setStatus({
        progress: 0,
        status: 'Backend not reachable'
      });
      console.error("Status API failed:", err);
    }
  };

  // initial call
  update();

  // polling loop
  timer = window.setInterval(update, 3000);

  return () => {
    if (timer) clearInterval(timer);
  };
}, [projectId]);
