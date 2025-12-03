import React, { useState, useRef, useEffect, useMemo } from 'react';

const GOOGLE_SHEET_ID = "1yTQxwYjcB_VbBaPssF70p9rkU3vFsdGfqYUnWFLCVtY";

// Helper to calculate total descendants
const countDescendants = (node) => {
  if (!node.children || node.children.length === 0) return 0;
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
};

// Build tree from flat data
const buildTree = (flatData) => {
  if (!flatData || flatData.length === 0) return null;

  // Create a map for quick lookup
  const nodeMap = {};
  flatData.forEach(item => {
    nodeMap[item.EmployeeID] = {
      id: item.EmployeeID,
      name: item.Name,
      title: item.Title,
      children: []
    };
  });

  // Find root and build tree
  let root = null;
  flatData.forEach(item => {
    const node = nodeMap[item.EmployeeID];
    const managerID = item.ManagerID?.trim();
    
    if (!managerID || !nodeMap[managerID]) {
      // This is the root node
      root = node;
    } else {
      // Add to parent's children
      nodeMap[managerID].children.push(node);
    }
  });

  return root;
};

const OrgNode = ({ node, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = node.children && node.children.length > 0;
  const totalTeamSize = countDescendants(node);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Node Card */}
      <div 
        className={`
          relative z-10 flex flex-col items-center p-4 rounded-xl shadow-lg border-2 transition-all duration-300 cursor-pointer
          ${level === 0 ? 'bg-blue-600 border-blue-700 text-white w-64' : 
            level === 1 ? 'bg-white border-blue-400 w-56 hover:shadow-xl hover:border-blue-500' :
            'bg-slate-50 border-slate-200 w-48 hover:bg-white hover:border-blue-300'}
        `}
        onClick={hasChildren ? handleToggle : undefined}
      >
        {/* Avatar */}
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center mb-3 text-lg font-bold shadow-sm
          ${level === 0 ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700'}
        `}>
          {node.name.charAt(0)}
        </div>

        {/* Info */}
        <div className="text-center">
          <h3 className={`font-bold text-sm mb-1 ${level === 0 ? 'text-white' : 'text-slate-800'}`}>
            {node.name}
          </h3>
          <p className={`text-xs ${level === 0 ? 'text-blue-100' : 'text-slate-500'}`}>
            {node.title}
          </p>
          {/* Total Team Size Badge */}
          {totalTeamSize > 0 && (
            <div className={`mt-2 text-xs font-semibold px-2 py-0.5 rounded-full inline-block
              ${level === 0 ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}
            `}>
              Team: {totalTeamSize}
            </div>
          )}
        </div>

        {/* Expand/Collapse Indicator */}
        {hasChildren && (
          <div className={`
            mt-3 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-transform duration-300
            ${level === 0 ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'}
            ${isExpanded ? 'rotate-180' : ''}
          `}>
            ▼
          </div>
        )}
      </div>

      {/* Connector Line (Vertical) */}
      {isExpanded && hasChildren && (
        <div className="w-px h-8 bg-slate-300"></div>
      )}

      {/* Children Container */}
      {isExpanded && hasChildren && (
        <div className="flex relative pt-4">
          <div className="flex space-x-8">
            {node.children.map((child, index) => (
              <div key={child.id} className="flex flex-col items-center relative">
                {/* Top Vertical Line for Child */}
                <div className="w-px h-8 bg-slate-300 absolute -top-8 left-1/2 -translate-x-1/2"></div>

                {/* Horizontal Connector Logic */}
                {node.children.length > 1 && (
                  <>
                    {index > 0 && (
                      <div className="h-px bg-slate-300 absolute -top-8 left-0 w-1/2"></div>
                    )}
                    {index < node.children.length - 1 && (
                      <div className="h-px bg-slate-300 absolute -top-8 right-0 w-1/2"></div>
                    )}
                  </>
                )}

                <OrgNode node={child} level={level + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ProcurementHierarchy = () => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hierarchyData, setHierarchyData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  // Fetch data from Google Sheet
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet4`);
        if (!response.ok) throw new Error('Failed to fetch hierarchy data');
        
        const csv = await response.text();
        
        // Parse CSV
        const lines = csv.split('\n');
        const result = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const row = [];
          let current = '';
          let inQuotes = false;

          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
              if (inQuotes && line[j + 1] === '"') {
                current += '"';
                j++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              row.push(current.replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          row.push(current.replace(/^"|"$/g, ''));
          result.push(row);
        }

        const headers = result[0];
        const dataRows = result.slice(1);
        const data = dataRows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });

        setHierarchyData(data);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading hierarchy data:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Build tree from flat data
  const teamTree = useMemo(() => {
    if (!hierarchyData) return null;
    return buildTree(hierarchyData);
  }, [hierarchyData]);

  // Center the chart initially and on reset
  const centerChart = () => {
    if (containerRef.current && contentRef.current) {
      const { clientWidth: containerWidth } = containerRef.current;
      const { clientWidth: contentWidth } = contentRef.current;
      
      const x = (containerWidth - contentWidth * scale) / 2;
      const y = 50;

      setPosition({ x, y });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      centerChart();
    }, 100);

    window.addEventListener('resize', centerChart);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', centerChart);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setScale(prevScale => Math.min(Math.max(0.2, prevScale + (e.deltaY > 0 ? -0.1 : 0.1)), 2));
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  const zoomIn = () => setScale(prev => Math.min(2, prev + 0.1));
  const zoomOut = () => setScale(prev => Math.max(0.2, prev - 0.1));
  const resetZoom = () => {
    setScale(1);
    centerChart();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 animate-spin rounded-full mx-auto mb-4 border-4 border-blue-200 border-t-transparent"></div>
          <p className="text-slate-700 text-xl font-semibold">Loading Team Hierarchy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-xl text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Error Loading Data</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!teamTree) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">No Data Available</h2>
            <p className="text-slate-600">Please add team data to Sheet4 in the Google Sheet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200 p-4 z-20 relative flex-shrink-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => window.location.href = '/'}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Team Hierarchy</h1>
              <p className="text-sm text-slate-500">Procurement Organization Structure</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
              {hierarchyData?.length || 0} Members
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
              Live Data
            </span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-24 right-8 z-30 flex flex-col space-y-2 bg-white p-2 rounded-lg shadow-lg border border-slate-200">
        <button onClick={zoomIn} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Zoom In">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        </button>
        <button onClick={zoomOut} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Zoom Out">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
        </button>
        <button onClick={resetZoom} className="p-2 hover:bg-slate-100 rounded text-slate-600" title="Reset View">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>
      </div>

      {/* Org Chart Container */}
      <div 
        ref={containerRef}
        className="flex-grow overflow-hidden cursor-grab bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          ref={contentRef}
          className="absolute origin-top transition-transform duration-75 ease-out inline-block"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` 
          }}
        >
           <OrgNode node={teamTree} />
        </div>
      </div>
      
      {/* Instructions Overlay */}
      <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-slate-200 text-xs font-medium text-slate-600 pointer-events-none">
        <p className="mb-1">• Scroll or pinch to zoom</p>
        <p className="mb-1">• Drag to pan</p>
        <p>• Click nodes to expand/collapse</p>
      </div>
    </div>
  );
};

export default ProcurementHierarchy;
